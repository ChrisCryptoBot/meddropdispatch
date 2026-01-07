// TIER 1.2: Mid-Load Compliance Re-Validation
// Re-validates driver license and vehicle compliance at critical status transitions
// Prevents "Mid-Load Compliance Expiry" edge case

import { prisma } from '@/lib/prisma'
import { ValidationError } from '@/lib/errors'
import { validateVehicleCompliance, isVehicleCompliant } from '@/lib/vehicle-compliance'

export interface ComplianceRevalidationResult {
  passed: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Re-validate driver and vehicle compliance at critical transitions (PICKED_UP, DELIVERED)
 * Throws ValidationError if non-compliant (hard stop)
 */
export async function revalidateComplianceAtTransition(
  loadRequestId: string,
  transitionStatus: 'PICKED_UP' | 'DELIVERED'
): Promise<ComplianceRevalidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Get load with driver and vehicle
  const load = await prisma.loadRequest.findUnique({
    where: { id: loadRequestId },
    include: {
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          licenseExpiry: true,
          hipaaTrainingDate: true,
          un3373ExpiryDate: true,
          un3373Certified: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          vehiclePlate: true,
          isActive: true,
          registrationExpiryDate: true,
          insuranceExpiryDate: true,
        },
      },
    },
  })

  if (!load) {
    throw new ValidationError('Load request not found')
  }

  if (!load.driverId) {
    throw new ValidationError('Load has no assigned driver')
  }

  const driver = load.driver
  if (!driver) {
    throw new ValidationError('Driver not found')
  }

  // TIER 1.2.1: Validate Driver License
  if (driver.licenseExpiry) {
    const licenseExpiry = new Date(driver.licenseExpiry)
    const now = new Date()
    
    if (licenseExpiry < now) {
      errors.push(
        `Driver license expired on ${licenseExpiry.toLocaleDateString()}. Cannot proceed with ${transitionStatus}.`
      )
    } else {
      const daysUntilExpiry = Math.ceil((licenseExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilExpiry <= 30) {
        warnings.push(`Driver license expires in ${daysUntilExpiry} days. Renew soon.`)
      }
    }
  } else {
    // Missing license expiry is a warning (may be optional in some jurisdictions)
    warnings.push('Driver license expiry date is missing. Verify license is valid.')
  }

  // TIER 1.2.2: Validate Vehicle Compliance
  if (load.vehicleId && load.vehicle) {
    const vehicle = load.vehicle
    
    // Check if vehicle is active
    if (!vehicle.isActive) {
      errors.push(
        `Vehicle ${vehicle.vehiclePlate} has been deactivated. Cannot proceed with ${transitionStatus}.`
      )
    }

    // Validate vehicle registration compliance
    if (!isVehicleCompliant(vehicle)) {
      const complianceStatus = vehicle.registrationExpiryDate
        ? vehicle.registrationExpiryDate < new Date()
          ? 'expired'
          : 'missing'
        : 'missing'
      
      errors.push(
        `Vehicle ${vehicle.vehiclePlate} registration is ${complianceStatus}. Cannot proceed with ${transitionStatus}.`
      )
    } else if (vehicle.registrationExpiryDate) {
      const regExpiry = new Date(vehicle.registrationExpiryDate)
      const now = new Date()
      const daysUntilExpiry = Math.ceil((regExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilExpiry <= 30) {
        warnings.push(`Vehicle ${vehicle.vehiclePlate} registration expires in ${daysUntilExpiry} days.`)
      }
    }

    // Check insurance expiry (optional but recommended)
    if (vehicle.insuranceExpiryDate) {
      const insuranceExpiry = new Date(vehicle.insuranceExpiryDate)
      const now = new Date()
      
      if (insuranceExpiry < now) {
        warnings.push(`Vehicle ${vehicle.vehiclePlate} insurance expired on ${insuranceExpiry.toLocaleDateString()}.`)
      }
    }
  } else {
    errors.push('Load has no assigned vehicle. Cannot proceed with pickup/delivery.')
  }

  // TIER 1.2.3: Validate HIPAA Training (if required)
  // HIPAA training is typically annual, check if older than 1 year
  if (driver.hipaaTrainingDate) {
    const trainingDate = new Date(driver.hipaaTrainingDate)
    const now = new Date()
    const daysSinceTraining = Math.floor((now.getTime() - trainingDate.getTime()) / (1000 * 60 * 60 * 24))
    const oneYearInDays = 365
    
    if (daysSinceTraining > oneYearInDays) {
      warnings.push(`HIPAA training is ${Math.floor(daysSinceTraining / 365)} years old. Annual renewal recommended.`)
    }
  }

  // TIER 1.2.4: Validate UN3373 Certification (if required for load)
  // This is checked at assignment, but we re-check here for mid-load expiry
  if (driver.un3373Certified && driver.un3373ExpiryDate) {
    const certExpiry = new Date(driver.un3373ExpiryDate)
    const now = new Date()
    
    if (certExpiry < now) {
      errors.push(
        `UN3373 certification expired on ${certExpiry.toLocaleDateString()}. Cannot proceed with ${transitionStatus}.`
      )
    }
  }

  // If there are errors, throw ValidationError (hard stop)
  if (errors.length > 0) {
    throw new ValidationError(
      `Compliance validation failed: ${errors.join(' ')} ${warnings.length > 0 ? `Warnings: ${warnings.join(' ')}` : ''}`
    )
  }

  return {
    passed: true,
    errors: [],
    warnings,
  }
}

