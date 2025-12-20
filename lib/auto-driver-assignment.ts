// Automated Driver Assignment
// Finds and scores the best driver for a load request

import { prisma } from './prisma'
import { detectLoadConflicts } from './load-conflict-detector'
import { calculateDistanceFromCoordinates } from './distance-calculator'

export interface DriverScore {
  driverId: string
  driver: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    status: string
    un3373Certified: boolean
    vehicleType: string | null
    hasRefrigeration: boolean
    yearsOfExperience: number | null
  }
  score: number
  reasons: string[]
  disqualifications: string[]
}

export interface AssignmentResult {
  recommendedDriver: DriverScore | null
  alternativeDrivers: DriverScore[]
  message: string
}

/**
 * Score a driver for a specific load
 */
async function scoreDriver(
  driverId: string,
  loadRequest: any
): Promise<DriverScore | null> {
  // Get driver with vehicles
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: {
      vehicles: {
        where: { isActive: true },
      },
      loadRequests: {
        where: {
          status: {
            in: ['SCHEDULED', 'EN_ROUTE', 'PICKED_UP', 'IN_TRANSIT'],
          },
        },
      },
    },
  })

  if (!driver) {
    return null
  }

  // Check if driver is available
  if (driver.status !== 'AVAILABLE' && driver.status !== 'ON_ROUTE') {
    return {
      driverId: driver.id,
      driver: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phone: driver.phone,
        status: driver.status,
        un3373Certified: driver.un3373Certified || false,
        vehicleType: driver.vehicleType,
        hasRefrigeration: driver.hasRefrigeration || false,
        yearsOfExperience: driver.yearsOfExperience,
      },
      score: 0,
      reasons: [],
      disqualifications: [`Driver status is ${driver.status}, not available`],
    }
  }

  let score = 100 // Start with base score
  const reasons: string[] = []
  const disqualifications: string[] = []

  // Check UN3373 certification for UN3373 specimens
  if (loadRequest.specimenCategory === 'UN3373_CATEGORY_B') {
    if (!driver.un3373Certified) {
      disqualifications.push('UN3373 certification required for this load')
      score = 0
    } else {
      reasons.push('✓ UN3373 certified')
      score += 20
    }
  }

  // Check refrigeration requirement
  if (loadRequest.temperatureRequirement === 'REFRIGERATED' || loadRequest.temperatureRequirement === 'FROZEN') {
    if (!driver.hasRefrigeration) {
      disqualifications.push('Refrigeration required for this load')
      score = 0
    } else {
      reasons.push('✓ Has refrigeration')
      score += 15
    }
  }

  // Check for load conflicts
  const conflictCheck = await detectLoadConflicts(driverId, {
    loadId: loadRequest.id,
    readyTime: loadRequest.readyTime ? new Date(loadRequest.readyTime) : new Date(),
    deliveryDeadline: loadRequest.deliveryDeadline ? new Date(loadRequest.deliveryDeadline) : new Date(),
  })

  if (conflictCheck.hasConflict && conflictCheck.conflictingLoads.length > 0) {
    disqualifications.push(`Has ${conflictCheck.conflictingLoads.length} conflicting load(s)`)
    score = 0
  } else {
    reasons.push('✓ No scheduling conflicts')
    score += 25
  }

  // Score based on current load count (fewer loads = better)
  const activeLoadCount = driver.loadRequests.length
  if (activeLoadCount === 0) {
    reasons.push('✓ No active loads')
    score += 20
  } else if (activeLoadCount === 1) {
    reasons.push('1 active load')
    score += 10
  } else if (activeLoadCount === 2) {
    reasons.push('2 active loads')
    score += 5
  } else {
    reasons.push(`${activeLoadCount} active loads`)
    // No bonus, but not disqualified
  }

  // Score based on experience
  if (driver.yearsOfExperience) {
    if (driver.yearsOfExperience >= 5) {
      reasons.push('✓ 5+ years experience')
      score += 10
    } else if (driver.yearsOfExperience >= 2) {
      reasons.push('✓ 2+ years experience')
      score += 5
    }
  }

  // Score based on vehicle type (larger vehicles for larger loads)
  if (loadRequest.estimatedWeightKg && loadRequest.estimatedWeightKg > 50) {
    // Prefer larger vehicles for heavy loads
    const largeVehicles = ['VAN', 'SPRINTER', 'BOX_TRUCK', 'REFRIGERATED']
    if (driver.vehicleType && largeVehicles.includes(driver.vehicleType)) {
      reasons.push('✓ Suitable vehicle for heavy load')
      score += 10
    }
  }

  // Location proximity (if we have GPS data)
  // TODO: Implement when GPS tracking is available
  // For now, we'll skip location scoring

  return {
    driverId: driver.id,
    driver: {
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.email,
      phone: driver.phone,
      status: driver.status,
      un3373Certified: driver.un3373Certified || false,
      vehicleType: driver.vehicleType,
      hasRefrigeration: driver.hasRefrigeration || false,
      yearsOfExperience: driver.yearsOfExperience,
    },
    score: Math.max(0, score), // Ensure score is non-negative
    reasons,
    disqualifications,
  }
}

/**
 * Find and score all available drivers for a load
 */
export async function findBestDriverForLoad(
  loadRequestId: string
): Promise<AssignmentResult> {
  // Get load request with facilities
  const loadRequest = await prisma.loadRequest.findUnique({
    where: { id: loadRequestId },
    include: {
      pickupFacility: true,
      dropoffFacility: true,
    },
  })

  if (!loadRequest) {
    throw new Error('Load request not found')
  }

  // Get all available drivers
  const drivers = await prisma.driver.findMany({
    where: {
      status: {
        in: ['AVAILABLE', 'ON_ROUTE'], // Include ON_ROUTE as they might be finishing up
      },
      // Note: isDeleted field exists but may not be in Prisma client yet
      // Filtering will be done in application logic if needed
    },
    include: {
      vehicles: {
        where: { isActive: true },
      },
    },
  })

  if (drivers.length === 0) {
    return {
      recommendedDriver: null,
      alternativeDrivers: [],
      message: 'No available drivers found',
    }
  }

  // Score all drivers
  const driverScores: DriverScore[] = []
  for (const driver of drivers) {
    const score = await scoreDriver(driver.id, loadRequest)
    if (score) {
      driverScores.push(score)
    }
  }

  // Filter out disqualified drivers (score = 0)
  const qualifiedDrivers = driverScores.filter((ds) => ds.score > 0)
  const disqualifiedDrivers = driverScores.filter((ds) => ds.score === 0)

  // Sort by score (highest first)
  qualifiedDrivers.sort((a, b) => b.score - a.score)

  // Get recommended driver (highest score)
  const recommendedDriver = qualifiedDrivers.length > 0 ? qualifiedDrivers[0] : null

  // Get alternative drivers (next 3 best)
  const alternativeDrivers = qualifiedDrivers.slice(1, 4)

  // Build message
  let message = ''
  if (recommendedDriver) {
    message = `Recommended: ${recommendedDriver.driver.firstName} ${recommendedDriver.driver.lastName} (Score: ${recommendedDriver.score})`
    if (recommendedDriver.reasons.length > 0) {
      message += ` - ${recommendedDriver.reasons.join(', ')}`
    }
  } else if (disqualifiedDrivers.length > 0) {
    message = `No qualified drivers found. ${disqualifiedDrivers.length} driver(s) checked but none meet requirements.`
  } else {
    message = 'No drivers available'
  }

  return {
    recommendedDriver,
    alternativeDrivers,
    message,
  }
}

/**
 * Auto-assign the best driver to a load
 */
export async function autoAssignDriver(
  loadRequestId: string,
  overrideDriverId?: string
): Promise<{
  success: boolean
  driver: any | null
  message: string
  loadRequest: any
}> {
  // If override driver ID provided, use it
  if (overrideDriverId) {
    const driver = await prisma.driver.findUnique({
      where: { id: overrideDriverId },
    })

    if (!driver) {
      throw new Error('Override driver not found')
    }

    // Assign the override driver
    const updatedLoad = await prisma.loadRequest.update({
      where: { id: loadRequestId },
      data: {
        driverId: overrideDriverId,
        assignedAt: new Date(),
        status: 'SCHEDULED',
      },
      include: {
        driver: true,
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Create tracking event
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: loadRequestId,
        code: 'DRIVER_EN_ROUTE_PICKUP',
        label: `Assigned to driver: ${driver.firstName} ${driver.lastName}`,
        description: `Driver ${driver.firstName} ${driver.lastName} has been assigned to this load.`,
        locationText: `${updatedLoad.pickupFacility.city}, ${updatedLoad.pickupFacility.state}`,
        actorType: 'ADMIN',
      },
    })

    return {
      success: true,
      driver: updatedLoad.driver,
      message: `Driver ${driver.firstName} ${driver.lastName} assigned (override)`,
      loadRequest: updatedLoad,
    }
  }

  // Find best driver
  const assignmentResult = await findBestDriverForLoad(loadRequestId)

  if (!assignmentResult.recommendedDriver) {
    return {
      success: false,
      driver: null,
      message: assignmentResult.message,
      loadRequest: null as any,
    }
  }

  // Assign the recommended driver
  const updatedLoad = await prisma.loadRequest.update({
    where: { id: loadRequestId },
    data: {
      driverId: assignmentResult.recommendedDriver.driverId,
      assignedAt: new Date(),
      status: 'SCHEDULED',
    },
    include: {
      driver: true,
      shipper: true,
      pickupFacility: true,
      dropoffFacility: true,
    },
  })

  // Create tracking event
  await prisma.trackingEvent.create({
    data: {
      loadRequestId: loadRequestId,
      code: 'DRIVER_EN_ROUTE_PICKUP',
      label: `Auto-assigned to driver: ${assignmentResult.recommendedDriver.driver.firstName} ${assignmentResult.recommendedDriver.driver.lastName}`,
      description: `Driver ${assignmentResult.recommendedDriver.driver.firstName} ${assignmentResult.recommendedDriver.driver.lastName} has been automatically assigned to this load. ${assignmentResult.recommendedDriver.reasons.join(', ')}`,
      locationText: `${updatedLoad.pickupFacility.city}, ${updatedLoad.pickupFacility.state}`,
      actorType: 'ADMIN',
    },
  })

  return {
    success: true,
    driver: updatedLoad.driver,
    message: assignmentResult.message,
    loadRequest: updatedLoad,
  }
}