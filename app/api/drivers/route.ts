import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers
 * Get all active drivers
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const drivers = await prisma.driver.findMany({
      where: {
        ...(status && { status: status as any }),
      },
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
    })

    return NextResponse.json({ drivers })
  })(request)
}
