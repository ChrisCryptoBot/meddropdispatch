import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const rateDriverSchema = z.object({
  shipperId: z.string().min(1, 'Shipper ID is required'),
  rating: z.number().min(1).max(5, 'Rating must be between 1 and 5'),
  feedback: z.string().optional(),
  wouldRecommend: z.boolean().default(true),
})

/**
 * POST /api/load-requests/[id]/rate-driver
 * Submit a rating and feedback for the driver after delivery
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await req.json()
    const validation = rateDriverSchema.safeParse(rawData)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid rating data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { shipperId, rating, feedback, wouldRecommend } = validation.data

    // Get load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: {
          select: { id: true },
        },
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Verify shipper owns this load
    if (loadRequest.shipperId !== shipperId) {
      throw new AuthorizationError('Unauthorized - you do not own this load')
    }

    // Verify load is delivered
    if (loadRequest.status !== 'DELIVERED') {
      throw new ValidationError('Can only rate driver for delivered loads')
    }

    // Verify driver is assigned
    if (!loadRequest.driverId || !loadRequest.driver) {
      throw new ValidationError('No driver assigned to this load')
    }

    // Check if rating already exists
    const existingRating = await prisma.driverRating.findUnique({
      where: { loadRequestId: id },
    })

    if (existingRating) {
      // Update existing rating
      const updatedRating = await prisma.driverRating.update({
        where: { id: existingRating.id },
        data: {
          rating,
          feedback: feedback || null,
          wouldRecommend,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Rating updated successfully',
        rating: updatedRating,
      })
    } else {
      // Create new rating
      const newRating = await prisma.driverRating.create({
        data: {
          loadRequestId: id,
          driverId: loadRequest.driver.id,
          shipperId,
          rating,
          feedback: feedback || null,
          wouldRecommend,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Rating submitted successfully',
        rating: newRating,
      }, { status: 201 })
    }
  })(request)
}

/**
 * GET /api/load-requests/[id]/rate-driver
 * Get existing rating for this load
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    const rating = await prisma.driverRating.findUnique({
      where: { loadRequestId: id },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        shipper: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    })

    if (!rating) {
      return NextResponse.json({
        rating: null,
      })
    }

    return NextResponse.json({
      rating,
    })
  })(request)
}


