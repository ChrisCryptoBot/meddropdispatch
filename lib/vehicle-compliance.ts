// Vehicle Compliance & Liability Shield (V2 - Strict Liability)
// Prevents "Ghost Liability" by enforcing registration validation

import { prisma } from '@/lib/prisma'

export type ComplianceStatus = 'VALID' | 'EXPIRING' | 'EXPIRED' | 'MISSING' | 'INACTIVE' | 'MAINTENANCE_WARNING' | 'MAINTENANCE_DUE'

export interface VehicleComplianceResult {
  isCompliant: boolean
  status: ComplianceStatus
  message: string
  daysUntilExpiry?: number
  milesSinceLastService?: number
  milesUntilMaintenanceDue?: number
}

export interface MaintenanceComplianceResult {
  isCompliant: boolean
  status: 'VALID' | 'WARNING' | 'DUE' // WARNING = 4500-5000 miles, DUE = >5000 miles
  message: string
  milesSinceLastService: number
  lastServiceOdometer: number | null
  lastServiceDate: Date | null
}

/**
 * Calculate vehicle compliance status (on-the-fly, never stored)
 * Rule: Compliance is calculated dynamically to avoid stale data
 */
export function isVehicleCompliant(vehicle: {
  isActive: boolean
  registrationExpiryDate: Date | null
}): boolean {
  if (!vehicle.isActive) return false
  if (!vehicle.registrationExpiryDate) return false // Missing Data = Non-Compliant
  if (vehicle.registrationExpiryDate < new Date()) return false // Expired
  return true
}

/**
 * Get detailed compliance status for a vehicle
 */
export function getVehicleComplianceStatus(vehicle: {
  isActive: boolean
  registrationExpiryDate: Date | null
}): VehicleComplianceResult {
  // Inactive vehicles are non-compliant
  if (!vehicle.isActive) {
    return {
      isCompliant: false,
      status: 'INACTIVE',
      message: 'Vehicle is inactive',
    }
  }

  // Missing registration date = non-compliant
  if (!vehicle.registrationExpiryDate) {
    return {
      isCompliant: false,
      status: 'MISSING',
      message: 'Vehicle registration date is missing. Upload registration document immediately.',
    }
  }

  const now = new Date()
  const expiryDate = new Date(vehicle.registrationExpiryDate)
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Expired
  if (expiryDate < now) {
    return {
      isCompliant: false,
      status: 'EXPIRED',
      message: `Vehicle registration expired on ${expiryDate.toLocaleDateString()}. Update immediately.`,
      daysUntilExpiry: daysUntilExpiry,
    }
  }

  // Expiring soon (< 30 days)
  if (daysUntilExpiry <= 30) {
    return {
      isCompliant: true, // Still compliant, but warning
      status: 'EXPIRING',
      message: `Vehicle registration expires in ${daysUntilExpiry} days. Renew soon.`,
      daysUntilExpiry: daysUntilExpiry,
    }
  }

  // Valid
  return {
    isCompliant: true,
    status: 'VALID',
    message: `Vehicle registration valid until ${expiryDate.toLocaleDateString()}`,
    daysUntilExpiry: daysUntilExpiry,
  }
}

/**
 * Validate vehicle compliance before assignment (Hard Stop)
 * Throws ValidationError if vehicle is non-compliant
 */
export async function validateVehicleCompliance(vehicleId: string): Promise<void> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      vehiclePlate: true,
      isActive: true,
      registrationExpiryDate: true,
    },
  })

  if (!vehicle) {
    throw new Error(`Vehicle ${vehicleId} not found`)
  }

  const compliance = getVehicleComplianceStatus(vehicle)

  if (!compliance.isCompliant) {
    throw new Error(
      `Vehicle ${vehicle.vehiclePlate} is non-compliant: ${compliance.message}. Cannot assign to load.`
    )
  }

  // If expiring soon, log warning but allow (compliance.isCompliant = true for EXPIRING)
  if (compliance.status === 'EXPIRING') {
    console.warn(
      `[Vehicle Compliance] Vehicle ${vehicle.vehiclePlate} expiring in ${compliance.daysUntilExpiry} days`
    )
  }
}

/**
 * Check if vehicle can be assigned to a load
 * Returns true/false with detailed reason
 */
export async function canAssignVehicle(vehicleId: string): Promise<{
  canAssign: boolean
  reason?: string
  compliance?: VehicleComplianceResult
}> {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        vehiclePlate: true,
        isActive: true,
        registrationExpiryDate: true,
      },
    })

    if (!vehicle) {
      return {
        canAssign: false,
        reason: 'Vehicle not found',
      }
    }

    const compliance = getVehicleComplianceStatus(vehicle)

    return {
      canAssign: compliance.isCompliant,
      reason: compliance.isCompliant ? undefined : compliance.message,
      compliance,
    }
  } catch (error) {
    return {
      canAssign: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get all non-compliant vehicles for a driver or fleet
 */
export async function getNonCompliantVehicles(driverIds: string[]): Promise<Array<{
  vehicleId: string
  vehiclePlate: string
  driverId: string
  compliance: VehicleComplianceResult
}>> {
  const vehicles = await prisma.vehicle.findMany({
    where: {
      driverId: { in: driverIds },
      isActive: true,
    },
    select: {
      id: true,
      vehiclePlate: true,
      driverId: true,
      isActive: true,
      registrationExpiryDate: true,
    },
  })

  const nonCompliant: Array<{
    vehicleId: string
    vehiclePlate: string
    driverId: string
    compliance: VehicleComplianceResult
  }> = []

  for (const vehicle of vehicles) {
    const compliance = getVehicleComplianceStatus(vehicle)
    if (!compliance.isCompliant || compliance.status === 'EXPIRING') {
      nonCompliant.push({
        vehicleId: vehicle.id,
        vehiclePlate: vehicle.vehiclePlate,
        driverId: vehicle.driverId,
        compliance,
      })
    }
  }

  return nonCompliant
}

/**
 * Check maintenance compliance for a vehicle (Fleet Enterprise - Tier 1)
 * Threshold: 5,000 miles since last OIL_CHANGE
 * Tier A (Warning): > 4,500 miles - Show Dashboard Alert & Send Email
 * Tier B (Hard Block): > 5,000 miles - Block NEW assignments
 */
export async function isMaintenanceCompliant(vehicleId: string): Promise<MaintenanceComplianceResult> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      vehiclePlate: true,
      currentOdometer: true,
      maintenanceLogs: {
        where: { type: 'OIL_CHANGE' },
        orderBy: { performedAt: 'desc' },
        take: 1,
        select: {
          odometer: true,
          performedAt: true,
        },
      },
    },
  })

  if (!vehicle) {
    throw new Error(`Vehicle ${vehicleId} not found`)
  }

  const lastOilChange = vehicle.maintenanceLogs[0] || null
  const lastServiceOdometer = lastOilChange?.odometer || 0
  const milesSinceLastService = vehicle.currentOdometer - lastServiceOdometer

  // Tier B: > 5,000 miles - Hard Block
  if (milesSinceLastService > 5000) {
    return {
      isCompliant: false,
      status: 'DUE',
      message: `Vehicle ${vehicle.vehiclePlate} requires maintenance. ${milesSinceLastService} miles since last oil change (exceeds 5,000 mile limit). Service immediately before accepting new loads.`,
      milesSinceLastService,
      lastServiceOdometer: lastOilChange?.odometer || null,
      lastServiceDate: lastOilChange?.performedAt || null,
    }
  }

  // Tier A: > 4,500 miles - Warning
  if (milesSinceLastService > 4500) {
    return {
      isCompliant: true, // Still compliant, but warning
      status: 'WARNING',
      message: `Vehicle ${vehicle.vehiclePlate} approaching maintenance due. ${milesSinceLastService} miles since last oil change. Service recommended soon.`,
      milesSinceLastService,
      lastServiceOdometer: lastOilChange?.odometer || null,
      lastServiceDate: lastOilChange?.performedAt || null,
    }
  }

  // Valid
  return {
    isCompliant: true,
    status: 'VALID',
    message: `Vehicle ${vehicle.vehiclePlate} maintenance up to date. ${milesSinceLastService} miles since last oil change.`,
    milesSinceLastService,
    lastServiceOdometer: lastOilChange?.odometer || null,
    lastServiceDate: lastOilChange?.performedAt || null,
  }
}

/**
 * Validate vehicle maintenance compliance before assignment (Hard Stop for NEW loads)
 * Throws ValidationError if maintenance is overdue (>5000 miles)
 * Note: This is a HARD BLOCK for NEW assignments, but active loads should be allowed to complete
 */
export async function validateMaintenanceCompliance(vehicleId: string, isActiveLoad: boolean = false): Promise<void> {
  const maintenance = await isMaintenanceCompliant(vehicleId)

  // Hard block for new assignments if maintenance is due
  if (!isActiveLoad && maintenance.status === 'DUE') {
    throw new Error(`Vehicle maintenance overdue: ${maintenance.message}`)
  }

  // Soft warning for active loads (log but don't block)
  if (isActiveLoad && maintenance.status === 'DUE') {
    console.warn(`[Vehicle Maintenance] Active load with overdue maintenance: ${maintenance.message}`)
  }

  // Log warnings for both new and active loads
  if (maintenance.status === 'WARNING') {
    console.warn(`[Vehicle Maintenance] Warning: ${maintenance.message}`)
  }
}

