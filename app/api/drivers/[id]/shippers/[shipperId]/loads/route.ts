import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers/[id]/shippers/[shipperId]/loads
 * Get all loads for a specific shipper that the driver has worked with
 * Includes completed loads for follow-up lists
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shipperId: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: driverId, shipperId } = await params

    // Verify shipper exists
    const shipper = await prisma.shipper.findUnique({
      where: { id: shipperId },
      select: { id: true, companyName: true },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    // Get all loads for this shipper that the driver has worked with
    // Include completed loads for follow-up lists
    const loads = await prisma.loadRequest.findMany({
      where: {
        shipperId: shipperId,
        driverId: driverId, // Only loads assigned to this driver
      },
      include: {
        pickupFacility: true,
        dropoffFacility: true,
        shipper: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            phone: true,
            email: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        trackingEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        documents: {
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    })

    return NextResponse.json({
      shipper: {
        id: shipper.id,
        companyName: shipper.companyName,
      },
      loads,
      total: loads.length,
    })
  })(request)
}

