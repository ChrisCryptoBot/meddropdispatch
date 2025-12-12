import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { notifyDriverShipperRequestedCall } from '@/lib/notifications'

/**
 * POST /api/load-requests/[id]/request-call
 * Shipper requests a call from the assigned driver
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    // Get load request with driver and shipper info
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        shipper: {
          select: {
            companyName: true,
            contactName: true,
            phone: true,
          },
        },
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    if (!loadRequest.driverId || !loadRequest.driver) {
      return NextResponse.json(
        {
          error: 'NoDriverAssigned',
          message: 'No driver is currently assigned to this load.',
        },
        { status: 400 }
      )
    }

    // Create notification for driver
    await notifyDriverShipperRequestedCall({
      driverId: loadRequest.driverId,
      loadRequestId: id,
      shipperName: loadRequest.shipper.companyName,
      shipperPhone: loadRequest.shipper.phone || '',
      trackingCode: loadRequest.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      message: 'The driver has been notified of your call request. They will call you when safe to do so.',
    })
  })(request)
}

