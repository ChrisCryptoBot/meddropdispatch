import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { requireDriver } from '@/lib/authorization'
import { sendLoadStatusEmail } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import { logger } from '@/lib/logger'

/**
 * POST /api/load-requests/[id]/release
 * Driver releases/unassigns themselves from a load (before pickup)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const nextReq = req as NextRequest

    // Require driver authentication
    const auth = await requireDriver(nextReq)

    // Get current load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Verify driver is assigned to this load
    if (loadRequest.driverId !== auth.userId) {
      throw new AuthorizationError('You are not assigned to this load')
    }

    // Only allow release for SCHEDULED loads (before pickup)
    if (loadRequest.status !== 'SCHEDULED') {
      throw new ValidationError(
        `Cannot release load with status: ${loadRequest.status}. You can only release loads that are SCHEDULED (before pickup).`
      )
    }

    // Update load: clear driver assignment
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        driverId: null,
        vehicleId: null,
        assignedAt: null,
        acceptedByDriverAt: null,
        status: 'NEW', // Reset to NEW so it appears on load board again
      },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Create tracking event for release
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'DRIVER_RELEASED',
        label: 'Driver Released Load',
        description: `Driver ${auth.userId} released this load. Load is now available for other drivers.`,
        locationText: 'MED DROP Driver Portal',
        actorType: 'DRIVER',
        actorId: auth.userId,
      },
    })

    // Notify shipper
    const trackingUrl = getTrackingUrl(updatedLoad.publicTrackingCode)
    await sendLoadStatusEmail({
      to: updatedLoad.shipper.email,
      trackingCode: updatedLoad.publicTrackingCode,
      companyName: updatedLoad.shipper.companyName,
      status: 'NEW',
      statusLabel: 'Driver Released Load',
      trackingUrl,
      quoteAmount: updatedLoad.quoteAmount || undefined,
      quoteCurrency: updatedLoad.quoteCurrency || 'USD',
      eta: `The driver has released this load. It is now available for assignment to another driver.`,
    })

    logger.info('Driver released load', {
      loadId: id,
      driverId: auth.userId,
      trackingCode: updatedLoad.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
      message: 'Load released successfully. It is now available for other drivers.',
    })
  })(request)
}

