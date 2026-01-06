// Compliance Checking Library
// Checks driver certifications, vehicle registration, insurance expiry

import { prisma } from '@/lib/prisma'

export interface ComplianceReminder {
  id: string
  type: 'DRIVER_CERTIFICATION' | 'VEHICLE_REGISTRATION' | 'INSURANCE' | 'DOT_COMPLIANCE'
  entityId: string // driverId or vehicleId
  entityType: 'DRIVER' | 'VEHICLE'
  title: string
  description: string
  expiryDate: Date
  daysUntilExpiry: number
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
}

/**
 * Check driver certifications (UN3373, HIPAA)
 */
export async function checkDriverCertifications(driverId: string): Promise<ComplianceReminder[]> {
  const reminders: ComplianceReminder[] = []
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  })

  if (!driver) return reminders

  const now = new Date()
  const criticalDays = 7
  const warningDays = 30

  // Check UN3373 certification expiry
  if (driver.un3373ExpiryDate) {
    const expiryDate = new Date(driver.un3373ExpiryDate)
    const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate)
    
    if (daysUntilExpiry <= warningDays) {
      reminders.push({
        id: `un3373-${driver.id}`,
        type: 'DRIVER_CERTIFICATION',
        entityId: driver.id,
        entityType: 'DRIVER',
        title: 'UN3373 Certification Expiring',
        description: `Driver ${driver.firstName} ${driver.lastName}'s UN3373 certification expires in ${daysUntilExpiry} days`,
        expiryDate,
        daysUntilExpiry,
        severity: getSeverity(daysUntilExpiry),
      })
    }
  } else if (driver.un3373Certified) {
    // Certified but no expiry date - flag as needing update
    reminders.push({
      id: `un3373-missing-date-${driver.id}`,
      type: 'DRIVER_CERTIFICATION',
      entityId: driver.id,
      entityType: 'DRIVER',
      title: 'UN3373 Certification Missing Expiry Date',
      description: `Driver ${driver.firstName} ${driver.lastName} is marked as UN3373 certified but expiry date is missing`,
      expiryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Placeholder
      daysUntilExpiry: 30,
      severity: 'INFO',
    })
  }

  // Check HIPAA training date (if older than 1 year, recommend renewal)
  if (driver.hipaaTrainingDate) {
    const trainingDate = new Date(driver.hipaaTrainingDate)
    const daysSinceTraining = Math.floor((now.getTime() - trainingDate.getTime()) / (1000 * 60 * 60 * 24))
    const oneYearInDays = 365
    
    if (daysSinceTraining > oneYearInDays) {
      const daysOverdue = daysSinceTraining - oneYearInDays
      reminders.push({
        id: `hipaa-${driver.id}`,
        type: 'DRIVER_CERTIFICATION',
        entityId: driver.id,
        entityType: 'DRIVER',
        title: 'HIPAA Training Overdue',
        description: `Driver ${driver.firstName} ${driver.lastName}'s HIPAA training is ${daysOverdue} days overdue (recommended annual renewal)`,
        expiryDate: new Date(trainingDate.getTime() + oneYearInDays * 24 * 60 * 60 * 1000),
        daysUntilExpiry: -daysOverdue,
        severity: daysOverdue > 90 ? 'CRITICAL' : daysOverdue > 30 ? 'WARNING' : 'INFO',
      })
    }
  }

  // Check driver license expiry
  if (driver.licenseExpiry) {
    const expiryDate = new Date(driver.licenseExpiry)
    const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate)
    
    if (daysUntilExpiry <= warningDays) {
      reminders.push({
        id: `license-${driver.id}`,
        type: 'DRIVER_CERTIFICATION',
        entityId: driver.id,
        entityType: 'DRIVER',
        title: 'Driver License Expiring',
        description: `Driver ${driver.firstName} ${driver.lastName}'s license expires in ${daysUntilExpiry} days`,
        expiryDate,
        daysUntilExpiry,
        severity: getSeverity(daysUntilExpiry),
      })
    }
  }

  return reminders
}

/**
 * Check vehicle registration expiry
 */
export async function checkVehicleRegistration(vehicleId: string): Promise<ComplianceReminder[]> {
  const reminders: ComplianceReminder[] = []
  // Note: This assumes you have a Vehicle model or vehicle registration fields
  return reminders
}

/**
 * Get all compliance reminders for admin dashboard
 */
export async function getAllComplianceReminders(): Promise<ComplianceReminder[]> {
  const reminders: ComplianceReminder[] = []
  const now = new Date()

  // Get all active drivers
  const drivers = await prisma.driver.findMany({
    where: { status: 'ACTIVE' },
  })

  for (const driver of drivers) {
    // Check certifications
    const certReminders = await checkDriverCertifications(driver.id)
    reminders.push(...certReminders)
  }

  // Sort by severity and days until expiry
  reminders.sort((a, b) => {
    const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 }
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity]
    }
    return a.daysUntilExpiry - b.daysUntilExpiry
  })

  return reminders
}

/**
 * Calculate days until expiry
 */
export function calculateDaysUntilExpiry(expiryDate: Date): number {
  const now = new Date()
  const diffTime = expiryDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Determine severity based on days until expiry
 */
export function getSeverity(daysUntilExpiry: number): 'CRITICAL' | 'WARNING' | 'INFO' {
  if (daysUntilExpiry <= 7) return 'CRITICAL'
  if (daysUntilExpiry <= 30) return 'WARNING'
  return 'INFO'
}

