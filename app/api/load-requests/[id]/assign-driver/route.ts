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
        temperatureRequirement: true,
        specimenCategory: true,
        readyTime: true,
        deliveryDeadline: true,
      }
    })

    if (!currentLoad) {
      throw new NotFoundError('Load request')
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

    // ATOMIC UPDATE: Only assign if driverId is null (or already set to same driver for idempotency) 
    // AND status is acceptable AND NOT in terminal state
    const atomicResult = await prisma.loadRequest.updateMany({
      where: {
        id,
        OR: [{ driverId: null }, { driverId }],
        status: { in: acceptableStatuses },
        // Explicitly exclude terminal states (defense in depth)
        NOT: {
          status: { in: terminalStatuses },
        },
      },
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
      if (latest.driverId && latest.driverId !== driverId) {
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

    // Create tracking event for driver assignment
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'SHIPPER_CONFIRMED',
        label: `Assigned to driver: ${updatedLoad?.driver?.firstName} ${updatedLoad?.driver?.lastName}`,
        description: `Load scheduled with driver ${updatedLoad?.driver?.firstName} ${updatedLoad?.driver?.lastName}`,
        locationText: 'MED DROP Dispatch',
        actorType: 'ADMIN',
      },
    })

    logger.info('Driver assigned to load', {
      loadId: id,
      driverId,
      previousStatus: currentLoad.status,
      newStatus: updatedLoad?.status,
      trackingCode: updatedLoad?.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad!,
    })
  })(request)
}
