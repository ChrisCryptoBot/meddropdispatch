// Load Conflict Detection Utilities
// Detects scheduling conflicts when drivers accept new loads

import { prisma } from './prisma'

export interface LoadTimeWindow {
  loadId: string
  readyTime: Date
  deliveryDeadline: Date
  estimatedDuration?: number // minutes
  pickupCity?: string
  pickupState?: string
  dropoffCity?: string
  dropoffState?: string
}

export interface ConflictResult {
  hasConflict: boolean
  conflictingLoads: Array<{
    id: string
    trackingCode: string
    conflict: string
    severity: 'high' | 'medium' | 'low'
  }>
  warnings: string[]
}

const DEFAULT_BUFFER_MINUTES = 30 // 30 minutes buffer between loads
const HIGH_SEVERITY_OVERLAP_MINUTES = 60 // Overlap > 60 minutes = high severity

/**
 * Detect scheduling conflicts for a driver accepting a new load
 */
export async function detectLoadConflicts(
  driverId: string,
  newLoad: LoadTimeWindow,
  bufferMinutes: number = DEFAULT_BUFFER_MINUTES
): Promise<ConflictResult> {
  // Get driver's active loads
  const activeLoads = await prisma.loadRequest.findMany({
    where: {
      driverId,
      status: {
        in: ['SCHEDULED', 'EN_ROUTE', 'PICKED_UP', 'IN_TRANSIT'],
      },
    },
    include: {
      pickupFacility: {
        select: {
          city: true,
          state: true,
        },
      },
      dropoffFacility: {
        select: {
          city: true,
          state: true,
        },
      },
    },
  })

  const conflicts: Array<{
    id: string
    trackingCode: string
    conflict: string
    severity: 'high' | 'medium' | 'low'
  }> = []
  const warnings: string[] = []

  for (const load of activeLoads) {
    if (!load.readyTime || !load.deliveryDeadline) continue

    // Calculate time windows with buffer
    const newStart = new Date(newLoad.readyTime.getTime() - bufferMinutes * 60 * 1000)
    const newEnd = new Date(newLoad.deliveryDeadline.getTime() + bufferMinutes * 60 * 1000)
    const existingStart = new Date(load.readyTime.getTime() - bufferMinutes * 60 * 1000)
    const existingEnd = new Date(load.deliveryDeadline.getTime() + bufferMinutes * 60 * 1000)

    // Check time overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      // Calculate overlap duration
      const overlapStart = new Date(Math.max(newStart.getTime(), existingStart.getTime()))
      const overlapEnd = new Date(Math.min(newEnd.getTime(), existingEnd.getTime()))
      const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (60 * 1000)

      // Determine severity
      let severity: 'high' | 'medium' | 'low' = 'low'
      if (overlapMinutes > HIGH_SEVERITY_OVERLAP_MINUTES) {
        severity = 'high'
      } else if (overlapMinutes > 15) {
        severity = 'medium'
      }

      // Build conflict description
      const conflictDescription = `Time overlap: ${Math.round(overlapMinutes)} minutes overlap with load ${load.publicTrackingCode}`

      conflicts.push({
        id: load.id,
        trackingCode: load.publicTrackingCode,
        conflict: conflictDescription,
        severity,
      })
    }

    // Check geographic feasibility (if locations are available)
    if (
      load.dropoffFacility &&
      newLoad.pickupCity &&
      newLoad.pickupState &&
      load.dropoffFacility.city &&
      load.dropoffFacility.state
    ) {
      // Check if new pickup is far from existing delivery
      const sameCity = 
        load.dropoffFacility.city.toLowerCase() === newLoad.pickupCity.toLowerCase() &&
        load.dropoffFacility.state.toLowerCase() === newLoad.pickupState.toLowerCase()

      if (!sameCity) {
        // Calculate if there's enough time to travel between locations
        const existingDeliveryTime = load.deliveryDeadline.getTime()
        const newPickupTime = newLoad.readyTime.getTime()
        const timeBetween = (newPickupTime - existingDeliveryTime) / (60 * 1000) // minutes

        // Rough estimate: need at least 30 minutes between different cities
        if (timeBetween < 30) {
          warnings.push(
            `Tight schedule: Only ${Math.round(timeBetween)} minutes between delivery of ${load.publicTrackingCode} and pickup of new load`
          )
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflictingLoads: conflicts,
    warnings,
  }
}

/**
 * Check if a driver can accept a new load based on their current schedule
 */
export async function canDriverAcceptLoad(
  driverId: string,
  newLoad: LoadTimeWindow
): Promise<{
  canAccept: boolean
  conflicts: ConflictResult
  recommendation: string
}> {
  const conflicts = await detectLoadConflicts(driverId, newLoad)

  let canAccept = true
  let recommendation = 'Load can be accepted'

  // Block if there are high-severity conflicts
  const highSeverityConflicts = conflicts.conflictingLoads.filter((c) => c.severity === 'high')
  if (highSeverityConflicts.length > 0) {
    canAccept = false
    recommendation = `Cannot accept: ${highSeverityConflicts.length} high-severity scheduling conflict(s) detected`
  } else if (conflicts.hasConflict) {
    // Warn but allow for medium/low severity
    recommendation = `Warning: ${conflicts.conflictingLoads.length} scheduling conflict(s) detected. Review carefully before accepting.`
  } else if (conflicts.warnings.length > 0) {
    recommendation = `Note: ${conflicts.warnings.length} scheduling warning(s). Review timing carefully.`
  }

  return {
    canAccept,
    conflicts,
    recommendation,
  }
}

