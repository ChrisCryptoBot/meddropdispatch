import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'
import { requireAuth } from '@/lib/authorization'
import { logUserAction } from '@/lib/audit-log'

const rateDriverSchema = z.object({
  shipperId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().optional().nullable(),
  wouldRecommend: z.boolean().default(true),
})

/**
 * GET /api/load-requests/[id]/rate-driver
 * Get existing rating for a load request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    // Get load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
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
          },
        },
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Get existing rating
    const rating = await prisma.driverRating.findUnique({
      where: { loadRequestId: id },
    })

    return NextResponse.json({
      rating: rating || null,
    })
  })(request)
}

/**
 * POST /api/load-requests/[id]/rate-driver
 * Submit or update driver rating
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    // Authenticate shipper
    const auth = await requireAuth(request)
    if (auth.userType !== 'shipper') {
      throw new AuthorizationError('Only shippers can rate drivers')
    }

    const { id } = await params
    const rawData = await req.json()

    // Validate request body
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

    // Verify shipper ID matches authenticated user
    if (auth.userId !== shipperId) {
      throw new AuthorizationError('You can only submit ratings for your own loads')
    }

    // Get load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
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

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Verify shipper owns this load
    if (loadRequest.shipperId !== shipperId) {
      throw new AuthorizationError('You can only rate drivers for your own loads')
    }

    // Verify load has a driver assigned
    if (!loadRequest.driverId) {
      throw new ValidationError('Cannot rate driver - no driver assigned to this load')
    }

    // Verify load is delivered or completed
    if (!['DELIVERED', 'COMPLETED'].includes(loadRequest.status)) {
      throw new ValidationError('You can only rate drivers after the load has been delivered')
    }

    // Check if rating already exists
    const existingRating = await prisma.driverRating.findUnique({
      where: { loadRequestId: id },
    })

    let driverRating

    if (existingRating) {
      // Update existing rating
      driverRating = await prisma.driverRating.update({
        where: { id: existingRating.id },
        data: {
          rating,
          feedback: feedback || null,
          wouldRecommend,
        },
      })

      // Log rating update
      await logUserAction('UPDATE', 'LOAD_REQUEST', {
        entityId: driverRating.id,
        userId: shipperId,
        userType: 'SHIPPER',
        userEmail: auth.email,
        req: request,
        changes: {
          rating: { from: existingRating.rating, to: rating },
          feedback: { from: existingRating.feedback, to: feedback },
          wouldRecommend: { from: existingRating.wouldRecommend, to: wouldRecommend },
        },
        metadata: {
          loadRequestId: id,
          driverId: loadRequest.driverId,
          trackingCode: loadRequest.publicTrackingCode,
        },
      })
    } else {
      // Create new rating
      driverRating = await prisma.driverRating.create({
        data: {
          loadRequestId: id,
          driverId: loadRequest.driverId,
          shipperId,
          rating,
          feedback: feedback || null,
          wouldRecommend,
        },
      })

      // Log rating creation
      await logUserAction('CREATE', 'LOAD_REQUEST', {
        entityId: driverRating.id,
        userId: shipperId,
        userType: 'SHIPPER',
        userEmail: auth.email,
        req: request,
        metadata: {
          loadRequestId: id,
          driverId: loadRequest.driverId,
          trackingCode: loadRequest.publicTrackingCode,
          rating,
          wouldRecommend,
        },
      })
    }

    return NextResponse.json({
      success: true,
      rating: driverRating,
    })
  })(request)
}
