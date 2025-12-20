import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers
 * Get all active drivers
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 per page
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) {
      where.status = status as any
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          vehicleType: true,
          vehicleMake: true,
          vehicleModel: true,
          vehiclePlate: true,
          hasRefrigeration: true,
          un3373Certified: true,
        },
        orderBy: [
          { status: 'asc' }, // Available first
          { firstName: 'asc' },
        ],
        take: limit,
        skip,
      }),
      prisma.driver.count({ where }),
    ])

    return NextResponse.json({
      drivers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    })
  })(request)
}
