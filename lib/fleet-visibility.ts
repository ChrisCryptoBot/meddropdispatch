// Fleet Visibility Scoping Utilities
// Handles data visibility based on fleet roles

import { prisma } from '@/lib/prisma'

/**
 * Get visibility scope for a driver
 * Returns the driver IDs that the requesting driver can see
 */
export async function getDriverVisibilityScope(driverId: string): Promise<string[]> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: {
      id: true,
      fleetRole: true,
      fleetId: true,
    },
  })

  if (!driver) {
    return []
  }

  // INDEPENDENT: Only see own data
  if (driver.fleetRole === 'INDEPENDENT' || !driver.fleetId) {
    return [driver.id]
  }

  // OWNER or ADMIN: See all drivers in their fleet
  if (driver.fleetRole === 'OWNER' || driver.fleetRole === 'ADMIN') {
    const fleetDrivers = await prisma.driver.findMany({
      where: { fleetId: driver.fleetId },
      select: { id: true },
    })
    return fleetDrivers.map(d => d.id)
  }

  // DRIVER: Only see own data
  return [driver.id]
}

/**
 * Build where clause for load requests based on fleet visibility
 */
export async function buildLoadVisibilityWhere(driverId: string, additionalWhere?: any) {
  const visibleDriverIds = await getDriverVisibilityScope(driverId)
  
  return {
    ...additionalWhere,
    driverId: {
      in: visibleDriverIds,
    },
  }
}

/**
 * Check if a driver can view another driver's data
 */
export async function canViewDriverData(viewerId: string, targetDriverId: string): Promise<boolean> {
  const visibleDriverIds = await getDriverVisibilityScope(viewerId)
  return visibleDriverIds.includes(targetDriverId)
}

