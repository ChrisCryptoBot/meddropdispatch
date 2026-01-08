import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, ConflictError } from '@/lib/errors'
import { assignDriverSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { validateDriverEligibility } from '@/lib/edge-case-validations'

/**
 * POST /api/load-requests/[id]/assign-driver
 * Assign a driver to a load
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
    const validation = await validateRequest(assignDriverSchema, rawData)
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

    const { driverId } = validation.data

    // TIER 2.9: Check if driver has opted out of assignments
    const driverOptOut = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { canBeAssignedLoads: true },
    })
    
    if (driverOptOut && driverOptOut.canBeAssignedLoads === false) {
      throw new ValidationError('Driver has opted out of load assignments. Cannot assign loads to this driver.')
    }

    // Get current load request with requirements for eligibility validation
    const currentLoad = await prisma.loadRequest.findUnique({
      where: { id },
      select: {
        status: true,
        driverId: true,
        temperatureRequirement: true,
        specimenCategory: true,
        readyTime: true,
        deliveryDeadline: true,
      }
    })

    if (!currentLoad) {
      throw new NotFoundError('Load request')
    }

    // Check if this is a reassignment (different driver)
    const isReassignment = currentLoad.driverId && currentLoad.driverId !== driverId
    
    // Reassignment is only allowed for SCHEDULED loads (not picked up or in transit)
    if (isReassignment && currentLoad.status !== 'SCHEDULED') {
      throw new ValidationError(
        `Cannot reassign load that is ${currentLoad.status}. Reassignment is only allowed for SCHEDULED loads (before pickup).`
      )
    }

    // Require admin for reassignments
    if (isReassignment) {
      try {
        const { requireAdmin } = await import('@/lib/authorization')
        await requireAdmin(request)
      } catch (adminError) {
        throw new ValidationError('Only admins can reassign loads from one driver to another.')
      }
    }

    // EDGE CASE VALIDATION: Section 3.1 - Driver Eligibility
    // Prevent assignment of ineligible drivers (PENDING_APPROVAL, OFF_DUTY, INACTIVE, missing certs, etc.)
    try {
      await validateDriverEligibility(driverId, {
        temperatureRequirement: currentLoad.temperatureRequirement || undefined,
        specimenCategory: currentLoad.specimenCategory || undefined,
        readyTime: currentLoad.readyTime || undefined,
        deliveryDeadline: currentLoad.deliveryDeadline || undefined,
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

    // LIABILITY SHIELD: Check if driver has at least one compliant vehicle
    // (Vehicle-specific validation happens at accept time, but we check availability here)
    const { getNonCompliantVehicles } = await import('@/lib/vehicle-compliance')
    const driverVehicles = await prisma.vehicle.findMany({
      where: {
        driverId,
        isActive: true,
      },
      select: {
        id: true,
        vehiclePlate: true,
        isActive: true,
        registrationExpiryDate: true,
      },
    })

    if (driverVehicles.length === 0) {
      throw new ValidationError('Driver has no active vehicles. Add a vehicle before assigning loads.')
    }

    // Check if driver has at least one compliant vehicle
    const { isVehicleCompliant } = await import('@/lib/vehicle-compliance')
    const hasCompliantVehicle = driverVehicles.some(v => isVehicleCompliant(v))
    
    if (!hasCompliantVehicle) {
      const nonCompliant = await getNonCompliantVehicles([driverId])
      const vehicleList = nonCompliant.map(v => `${v.vehiclePlate} (${v.compliance.status})`).join(', ')
      throw new ValidationError(
        `Driver has no compliant vehicles. All vehicles are expired or missing registration: ${vehicleList}. Update vehicle registration before assigning loads.`
      )
    }

    // EDGE CASE 6.5: Fleet Enterprise - Check maintenance compliance for all vehicles
    // Driver must have at least one vehicle with valid maintenance (<5000 miles since last oil change)
    const { isMaintenanceCompliant } = await import('@/lib/vehicle-compliance')
    let hasMaintenanceCompliantVehicle = false
    const maintenanceIssues: string[] = []
    
    for (const vehicle of driverVehicles) {
      try {
        const maintenance = await isMaintenanceCompliant(vehicle.id)
        if (maintenance.status !== 'DUE') {
          // Vehicle is either VALID or WARNING (still acceptable for new assignments)
          hasMaintenanceCompliantVehicle = true
        } else {
          // Maintenance DUE - log issue but continue checking other vehicles
          maintenanceIssues.push(`${vehicle.vehiclePlate}: ${maintenance.message}`)
        }
      } catch (error) {
        // If maintenance check fails, log but don't block (vehicle might not have maintenance logs yet)
        logger.warn(
          `Maintenance check failed for vehicle ${vehicle.id}`,
          { vehicleId: vehicle.id },
          error instanceof Error ? error : undefined
        )
      }
    }
    
    if (!hasMaintenanceCompliantVehicle && driverVehicles.length > 0) {
      throw new ValidationError(
        `Driver has no vehicles with valid maintenance. All vehicles require service: ${maintenanceIssues.join('; ')}. Service vehicles before assigning loads.`
      )
    }

    // Status gating - prevent assignment in mid-transit or terminal states
    const acceptableStatuses = ['NEW', 'REQUESTED', 'QUOTED', 'QUOTE_ACCEPTED', 'SCHEDULED']
    const terminalStatuses = ['DELIVERED', 'DENIED', 'CANCELLED', 'COMPLETED']
    
    // Explicitly block assignment to CANCELLED or COMPLETED loads
    if (terminalStatuses.includes(currentLoad.status)) {
      throw new ValidationError(`Cannot assign driver to a load in terminal state: ${currentLoad.status}`)
    }
    
    if (!acceptableStatuses.includes(currentLoad.status)) {
      throw new ValidationError(`Cannot assign driver when load status is ${currentLoad.status}`)
    }

    // Determine if we should auto-schedule (only for early statuses)
    const shouldSchedule = ['NEW', 'REQUESTED', 'QUOTED', 'QUOTE_ACCEPTED'].includes(currentLoad.status)

    // TIER 1.1: Snapshot driver's fleetId at assignment to prevent payee reversion
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { fleetId: true, fleetRole: true },
    })
    const contractedFleetId = driver?.fleetRole !== 'INDEPENDENT' ? driver?.fleetId || null : null

    // Store previous driver for notifications if this is a reassignment
    const previousDriverId = currentLoad.driverId

    // ATOMIC UPDATE: Allow assignment if:
    // 1. driverId is null (unassigned load), OR
    // 2. driverId matches new driver (idempotency), OR
    // 3. This is a reassignment (isReassignment = true) and load is SCHEDULED
    const whereClause: any = {
      id,
      status: { in: acceptableStatuses },
      NOT: {
        status: { in: terminalStatuses },
      },
    }

    // For reassignment, allow if current driver matches previous driver
    // For new assignment, allow if driverId is null or matches
    if (isReassignment) {
      whereClause.driverId = previousDriverId
    } else {
      whereClause.OR = [{ driverId: null }, { driverId }]
    }

    const atomicResult = await prisma.loadRequest.updateMany({
      where: whereClause,
      data: {
        driverId,
        assignedAt: new Date(),
        contractedFleetId, // Snapshot fleet at assignment
        ...(shouldSchedule ? { status: 'SCHEDULED' } : {}),
      },
    })

    if (atomicResult.count === 0) {
      // Re-check current state to provide meaningful error
      const latest = await prisma.loadRequest.findUnique({
        where: { id },
        select: { driverId: true, status: true },
      })
      if (!latest) {
        throw new NotFoundError('Load request')
      }
      if (isReassignment && latest.driverId !== previousDriverId) {
        throw new ConflictError('Load was reassigned by another admin. Please refresh and try again.')
      }
      if (latest.driverId && latest.driverId !== driverId && !isReassignment) {
        throw new ConflictError('Load already assigned to another driver')
      }
      throw new ConflictError('Load could not be assigned due to concurrent update')
    }

    // Fetch updated entity with relations for response and logging
    const updatedLoad = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Get previous driver info if this was a reassignment
    let previousDriver: { firstName: string; lastName: string; email: string } | null = null
    if (isReassignment && previousDriverId) {
      const prevDriver = await prisma.driver.findUnique({
        where: { id: previousDriverId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      })
      if (prevDriver) {
        previousDriver = prevDriver
      }
    }

    // Create tracking event for driver assignment or reassignment
    const eventCode = isReassignment ? 'DRIVER_REASSIGNED' : 'SHIPPER_CONFIRMED'
    const eventLabel = isReassignment
      ? `Reassigned from ${previousDriver?.firstName} ${previousDriver?.lastName} to ${updatedLoad?.driver?.firstName} ${updatedLoad?.driver?.lastName}`
      : `Assigned to driver: ${updatedLoad?.driver?.firstName} ${updatedLoad?.driver?.lastName}`
    const eventDescription = isReassignment
      ? `Load reassigned from ${previousDriver?.firstName} ${previousDriver?.lastName} to ${updatedLoad?.driver?.firstName} ${updatedLoad?.driver?.lastName}`
      : `Load scheduled with driver ${updatedLoad?.driver?.firstName} ${updatedLoad?.driver?.lastName}`

    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: eventCode,
        label: eventLabel,
        description: eventDescription,
        locationText: 'MED DROP Dispatch',
        actorType: 'ADMIN',
      },
    })

    // Send notifications for reassignment
    if (isReassignment && previousDriver && updatedLoad?.driver) {
      const { sendLoadStatusEmail } = await import('@/lib/email')
      const { getTrackingUrl } = await import('@/lib/utils')
      const trackingUrl = getTrackingUrl(updatedLoad.publicTrackingCode)

      // Notify previous driver
      await sendLoadStatusEmail({
        to: previousDriver.email,
        trackingCode: updatedLoad.publicTrackingCode,
        companyName: updatedLoad.shipper.companyName,
        status: 'CANCELLED',
        statusLabel: 'Load Reassigned',
        trackingUrl,
        quoteAmount: updatedLoad.quoteAmount || undefined,
        quoteCurrency: updatedLoad.quoteCurrency || 'USD',
        eta: `This load has been reassigned to another driver.`,
      })

      // Notify new driver
      await sendLoadStatusEmail({
        to: updatedLoad.driver.email,
        trackingCode: updatedLoad.publicTrackingCode,
        companyName: updatedLoad.shipper.companyName,
        status: 'SCHEDULED',
        statusLabel: 'Load Assigned',
        trackingUrl,
        quoteAmount: updatedLoad.quoteAmount || undefined,
        quoteCurrency: updatedLoad.quoteCurrency || 'USD',
        eta: `You have been assigned to this load.`,
      })
    }

    logger.info(isReassignment ? 'Driver reassigned to load' : 'Driver assigned to load', {
      loadId: id,
      driverId,
      previousDriverId: previousDriverId || null,
      previousStatus: currentLoad.status,
      newStatus: updatedLoad?.status,
      trackingCode: updatedLoad?.publicTrackingCode,
      isReassignment,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad!,
    })
  })(request)
}
