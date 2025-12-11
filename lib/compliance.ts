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

  // Check UN3373 certification (if stored)
  // Note: This assumes you add certification fields to Driver model
  // For now, this is a placeholder structure

  // Check HIPAA certification
  // Note: This assumes you add certification fields to Driver model

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

