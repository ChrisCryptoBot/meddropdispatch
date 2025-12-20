import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLoadDeniedNotification } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import type { DriverDenialReason } from '@/lib/types'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { denyLoadSchema } from '@/lib/validation'

/**
 * POST /api/load-requests/[id]/deny
 * Driver denies/declines a load with a reason
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
    const rawData = await req.json()
    
    // Validate request body
    const validation = await validateRequest(denyLoadSchema, rawData)
    if (!validation.success) {
      const formatted = formatZodErrors(validation.errors)
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: formatted.message,
          errors: formatted.errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const { driverId, reason, notes } = validation.data

    // Get current load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: true,
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Check if load is in a state that can be denied
    // Driver can only deny loads that are REQUESTED (before acceptance)
    if (loadRequest.status !== 'REQUESTED') {
      throw new ValidationError(`Cannot deny load with status: ${loadRequest.status}. Load must be REQUESTED.`)
    }

    // Update load with denial information - set to DENIED status
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        driverId: null, // Clear driver assignment
        assignedAt: null,
        acceptedByDriverAt: null,
        status: 'DENIED', // Set to DENIED - doesn't fit schedule
        driverDenialReason: reason as DriverDenialReason,
        driverDenialNotes: notes || null,
        driverDeniedAt: new Date(),
        lastDeniedByDriverId: driverId,
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Get driver info for tracking event
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        firstName: true,
        lastName: true,
      },
    })

    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : 'Driver'

    // Create tracking event for denial
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'DENIED',
        label: `Not Scheduled`,
        description: `This scheduling request could not be accommodated. Reason: ${reason}${notes ? `. Notes: ${notes}` : ''}`,
        locationText: 'MED DROP Driver Portal',
        actorType: 'DRIVER',
        actorId: driverId,
      },
    })

    // Send notification to shipper
    const trackingUrl = getTrackingUrl(updatedLoad.publicTrackingCode)
    await sendLoadDeniedNotification({
      to: updatedLoad.shipper.email,
      companyName: updatedLoad.shipper.companyName,
      trackingCode: updatedLoad.publicTrackingCode,
      reason,
      notes: notes || null,
      trackingUrl,
    })

    logger.info('Load denied by driver', {
      loadId: id,
      driverId,
      reason,
      trackingCode: updatedLoad.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
      message: 'Load denied. Status set to DENIED.',
    })
  })(request)
}

