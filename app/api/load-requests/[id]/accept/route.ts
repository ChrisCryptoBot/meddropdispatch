import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDriverAcceptedNotification, sendLoadScheduledNotification } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, AuthorizationError, ConflictError } from '@/lib/errors'
import { acceptLoadSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { requireDriver, verifyDriverAccess } from '@/lib/authorization'
import { validateDriverEligibility, validateDriverAssignmentAtomic } from '@/lib/edge-case-validations'

/**
 * POST /api/load-requests/[id]/accept
 * Driver accepts/claims a load
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await nextReq.json()

    // Validate request body
    const validation = await validateRequest(acceptLoadSchema, rawData)
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

    const { driverId, vehicleId, gpsTrackingEnabled } = validation.data

    // AUTHORIZATION: Verify that the authenticated driver matches the driverId in request
    const auth = await requireDriver(nextReq)
    if (auth.userId !== driverId) {
      throw new AuthorizationError('Cannot accept loads as another driver')
    }

    // Verify vehicle belongs to driver
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        driverId: driverId,
        isActive: true,
      },
    })

    if (!vehicle) {
      throw new ValidationError('Vehicle not found or does not belong to driver')
    }

    // Get current load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: true,
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Check if load can be accepted (must be NEW, REQUESTED, QUOTED, or QUOTE_ACCEPTED)
    const acceptableStatuses = ['NEW', 'REQUESTED', 'QUOTED', 'QUOTE_ACCEPTED']
    if (!acceptableStatuses.includes(loadRequest.status)) {
      throw new ValidationError(`Cannot accept load with status: ${loadRequest.status}. Load must be NEW, REQUESTED, QUOTED, or QUOTE_ACCEPTED.`)
    }

    // EDGE CASE VALIDATION: Section 3.1 - Driver Eligibility
    try {
      await validateDriverEligibility(driverId, {
        temperatureRequirement: loadRequest.temperatureRequirement || undefined,
        specimenCategory: loadRequest.specimenCategory || undefined,
        readyTime: loadRequest.readyTime || undefined,
        deliveryDeadline: loadRequest.deliveryDeadline || undefined,
      })
    } catch (eligibilityError) {
      if (eligibilityError instanceof ValidationError || eligibilityError instanceof ConflictError) {
        return NextResponse.json(
          {
            error: eligibilityError.name,
            message: eligibilityError.message,
            code: eligibilityError.code,
            timestamp: new Date().toISOString(),
          },
          { status: eligibilityError.statusCode }
        )
      }
      throw eligibilityError
    }

    // ATOMIC UPDATE: Use updateMany with WHERE clause to prevent race condition
    // Only update if driverId is null or matches current driver (allows re-acceptance by same driver)
    const updateResult = await prisma.loadRequest.updateMany({
      where: {
        id,
        OR: [
          { driverId: null },
          { driverId: driverId },
        ],
        status: {
          in: acceptableStatuses,
        },
      },
      data: {
        driverId,
        vehicleId,
        assignedAt: loadRequest.assignedAt || new Date(),
        acceptedByDriverAt: new Date(),
        // Set status to SCHEDULED - driver accepted after phone call, tracking now active
        status: 'SCHEDULED',
        // Enable GPS tracking if driver chose to enable it
        gpsTrackingEnabled: gpsTrackingEnabled === true,
        gpsTrackingStartedAt: gpsTrackingEnabled === true ? new Date() : null,
      },
    })

    // Check if update actually happened (race condition check)
    if (updateResult.count === 0) {
      // Reload to check current state
      const currentLoad = await prisma.loadRequest.findUnique({
        where: { id },
        select: { driverId: true, status: true },
      })

      if (!currentLoad) {
        throw new NotFoundError('Load request')
      }

      if (currentLoad.driverId && currentLoad.driverId !== driverId) {
        logger.warn('Race condition detected: Load accepted by another driver', { loadId: id, currentDriverId: currentLoad.driverId, attemptingDriverId: driverId })
        throw new ConflictError('This load has already been accepted by another driver')
      }

      if (!acceptableStatuses.includes(currentLoad.status)) {
        logger.warn('Race condition detected: Status changed during acceptance', { loadId: id, status: currentLoad.status })
        throw new ConflictError(`Cannot accept load with status: ${currentLoad.status}. Load must be NEW, REQUESTED, QUOTED, or QUOTE_ACCEPTED.`)
      }

      throw new ConflictError('Failed to accept load. Please try again.')
    }

    // Fetch the updated load with all relations
    const updatedLoad = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehiclePlate: true,
            nickname: true,
          },
        },
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!updatedLoad) {
      throw new NotFoundError('Load request')
    }

    // Update the initial "Request Received" event description to reflect acceptance
    // Find the first REQUEST_RECEIVED event and update its description
    const initialEvent = await prisma.trackingEvent.findFirst({
      where: {
        loadRequestId: id,
        code: 'REQUEST_RECEIVED',
      },
      orderBy: { createdAt: 'asc' },
    })

    if (initialEvent) {
      await prisma.trackingEvent.update({
        where: { id: initialEvent.id },
        data: {
          description: 'Your scheduling request has been received. A driver will call shortly to confirm details and pricing.',
        },
      })
    }

    // Create tracking event for scheduling (tracking starts here)
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'SCHEDULED',
        label: `Scheduled`,
        description: `Your delivery has been scheduled. Tracking is now available.`,
        locationText: 'MED DROP Driver Portal',
        actorType: 'DRIVER',
        actorId: driverId,
      },
    })

    // Send email notifications
    const trackingUrl = getTrackingUrl(updatedLoad.publicTrackingCode)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const driverPortalUrl = `${baseUrl}/driver/loads`

    // Notify shipper that driver has accepted (driver will call)
    await sendDriverAcceptedNotification({
      to: updatedLoad.shipper.email,
      companyName: updatedLoad.shipper.companyName,
      trackingCode: updatedLoad.publicTrackingCode,
      driverName: `${updatedLoad.driver?.firstName || ''} ${updatedLoad.driver?.lastName || ''}`.trim(),
      driverPhone: updatedLoad.driver?.phone || 'Not provided',
      trackingUrl,
    })

    // Notify both parties that load is scheduled
    await sendLoadScheduledNotification({
      shipperEmail: updatedLoad.shipper.email,
      driverEmail: updatedLoad.driver?.email || null,
      companyName: updatedLoad.shipper.companyName,
      driverName: `${updatedLoad.driver?.firstName || ''} ${updatedLoad.driver?.lastName || ''}`.trim(),
      trackingCode: updatedLoad.publicTrackingCode,
      trackingUrl,
      driverPortalUrl,
      pickupAddress: `${updatedLoad.pickupFacility.addressLine1}, ${updatedLoad.pickupFacility.city}, ${updatedLoad.pickupFacility.state}`,
      dropoffAddress: `${updatedLoad.dropoffFacility.addressLine1}, ${updatedLoad.dropoffFacility.city}, ${updatedLoad.dropoffFacility.state}`,
      readyTime: updatedLoad.readyTime,
      deliveryDeadline: updatedLoad.deliveryDeadline,
    })

    // Create in-app notification for driver (they already accepted, but this confirms it's scheduled)
    if (driverId) {
      const { notifyDriverLoadStatusChanged } = await import('@/lib/notifications')
      await notifyDriverLoadStatusChanged({
        driverId,
        loadRequestId: id,
        trackingCode: updatedLoad.publicTrackingCode,
        oldStatus: loadRequest.status,
        newStatus: 'SCHEDULED',
        statusLabel: 'Scheduled',
      })
    }

    logger.info('Load accepted by driver', {
      loadId: id,
      driverId,
      trackingCode: updatedLoad.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
    })
  })(request)
}
