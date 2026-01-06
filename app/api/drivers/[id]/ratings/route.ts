import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers/[id]/ratings
 * Get driver rating statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Get all ratings for this driver
    const ratings = await prisma.driverRating.findMany({
      where: { driverId: id },
      select: {
        rating: true,
      },
    })

    // Calculate statistics
    const ratingCount = ratings.length
    const averageRating = ratingCount > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratingCount
      : 0

    // Get rating distribution
    const distribution = {
      5: ratings.filter(r => r.rating === 5).length,
      4: ratings.filter(r => r.rating === 4).length,
      3: ratings.filter(r => r.rating === 3).length,
      2: ratings.filter(r => r.rating === 2).length,
      1: ratings.filter(r => r.rating === 1).length,
    }

    return NextResponse.json({
      averageRating,
      ratingCount,
      distribution,
    })
  })(request)
}

