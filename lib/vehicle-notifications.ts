// Vehicle Registration Expiry Notification System ("The Nag Protocol")
// Proactive alerts to prevent downtime and liability issues

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { getVehicleComplianceStatus } from './vehicle-compliance'

export type NotificationLevel = 'WARNING_30_DAYS' | 'URGENT_7_DAYS' | 'CRITICAL_1_DAY' | 'EXPIRED'

interface NotificationCheck {
  vehicleId: string
  vehiclePlate: string
  driverId: string
  driverName: string
  driverEmail: string
  driverPhone: string
  fleetOwnerId?: string
  fleetOwnerEmail?: string
  fleetOwnerName?: string
  expiryDate: Date
  daysUntilExpiry: number
  level: NotificationLevel
}

/**
 * Check for vehicles needing expiry notifications
 * Returns list of vehicles that need notifications sent
 */
export async function checkVehicleExpiryNotifications(): Promise<NotificationCheck[]> {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Get all active vehicles with registration dates
  const vehicles = await prisma.vehicle.findMany({
    where: {
      isActive: true,
      registrationExpiryDate: { not: null },
    },
    include: {
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          fleetId: true,
          fleetRole: true,
          fleet: {
            include: {
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  })

  const notifications: NotificationCheck[] = []

  for (const vehicle of vehicles) {
    if (!vehicle.registrationExpiryDate) continue

    const expiryDate = new Date(vehicle.registrationExpiryDate)
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Determine notification level
    let level: NotificationLevel | null = null

    if (expiryDate < now) {
      level = 'EXPIRED'
    } else if (daysUntilExpiry <= 1) {
      level = 'CRITICAL_1_DAY'
    } else if (daysUntilExpiry <= 7) {
      level = 'URGENT_7_DAYS'
    } else if (daysUntilExpiry <= 30) {
      level = 'WARNING_30_DAYS'
    }

    if (!level) continue

    // Check if notification was already sent (prevent duplicates)
    const existingNotification = await prisma.notification.findFirst({
      where: {
        driverId: vehicle.driverId,
        type: 'VEHICLE_REGISTRATION_EXPIRING',
        metadata: {
          contains: `"vehicleId":"${vehicle.id}"`,
        },
        createdAt: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Within last 24 hours
        },
      },
    })

    if (existingNotification) continue // Already notified today

    const driverName = `${vehicle.driver.firstName} ${vehicle.driver.lastName}`
    const fleetOwner = vehicle.driver.fleet?.owner

    notifications.push({
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.vehiclePlate,
      driverId: vehicle.driverId,
      driverName,
      driverEmail: vehicle.driver.email,
      driverPhone: vehicle.driver.phone,
      fleetOwnerId: fleetOwner?.id,
      fleetOwnerEmail: fleetOwner?.email,
      fleetOwnerName: fleetOwner ? `${fleetOwner.firstName} ${fleetOwner.lastName}` : undefined,
      expiryDate,
      daysUntilExpiry,
      level,
    })
  }

  return notifications
}

/**
 * Send expiry notification to driver and fleet owner
 */
export async function sendVehicleExpiryNotification(check: NotificationCheck): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const vehicleUrl = `${baseUrl}/driver/vehicle`

  // Determine message content based on level
  let subject: string
  let emailBody: string
  let smsMessage: string

  if (check.level === 'EXPIRED') {
    subject = `URGENT: Vehicle ${check.vehiclePlate} Registration Expired`
    emailBody = `
      <h2>Vehicle Registration Expired</h2>
      <p><strong>Vehicle:</strong> ${check.vehiclePlate}</p>
      <p><strong>Expired:</strong> ${check.expiryDate.toLocaleDateString()}</p>
      <p style="color: red; font-weight: bold;">This vehicle has been deactivated and cannot be assigned to new loads.</p>
      <p>Upload a new registration document immediately to restore vehicle access.</p>
      <a href="${vehicleUrl}" style="display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">Update Registration</a>
    `
    smsMessage = `URGENT: Vehicle ${check.vehiclePlate} registration expired on ${check.expiryDate.toLocaleDateString()}. Vehicle deactivated. Update immediately: ${vehicleUrl}`
  } else if (check.level === 'CRITICAL_1_DAY') {
    subject = `CRITICAL: Vehicle ${check.vehiclePlate} Registration Expires Tomorrow`
    emailBody = `
      <h2>Registration Expires Tomorrow</h2>
      <p><strong>Vehicle:</strong> ${check.vehiclePlate}</p>
      <p><strong>Expires:</strong> ${check.expiryDate.toLocaleDateString()}</p>
      <p style="color: red; font-weight: bold;">Action required immediately to prevent vehicle deactivation.</p>
      <a href="${vehicleUrl}" style="display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">Renew Registration</a>
    `
    smsMessage = `CRITICAL: Vehicle ${check.vehiclePlate} registration expires tomorrow (${check.expiryDate.toLocaleDateString()}). Renew now: ${vehicleUrl}`
  } else if (check.level === 'URGENT_7_DAYS') {
    subject = `URGENT: Vehicle ${check.vehiclePlate} Registration Expires in ${check.daysUntilExpiry} Days`
    emailBody = `
      <h2>Registration Expiring Soon</h2>
      <p><strong>Vehicle:</strong> ${check.vehiclePlate}</p>
      <p><strong>Expires:</strong> ${check.expiryDate.toLocaleDateString()} (${check.daysUntilExpiry} days)</p>
      <p>Please renew your vehicle registration to avoid service interruption.</p>
      <a href="${vehicleUrl}" style="display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">Renew Registration</a>
    `
    smsMessage = `URGENT: Vehicle ${check.vehiclePlate} registration expires in ${check.daysUntilExpiry} days (${check.expiryDate.toLocaleDateString()}). Renew: ${vehicleUrl}`
  } else {
    // WARNING_30_DAYS
    subject = `Vehicle ${check.vehiclePlate} Registration Expires in ${check.daysUntilExpiry} Days`
    emailBody = `
      <h2>Registration Expiring Soon</h2>
      <p><strong>Vehicle:</strong> ${check.vehiclePlate}</p>
      <p><strong>Expires:</strong> ${check.expiryDate.toLocaleDateString()} (${check.daysUntilExpiry} days)</p>
      <p>Consider renewing your vehicle registration soon to avoid last-minute issues.</p>
      <a href="${vehicleUrl}" style="display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Vehicle</a>
    `
    smsMessage = `Vehicle ${check.vehiclePlate} registration expires in ${check.daysUntilExpiry} days. Renew soon: ${vehicleUrl}`
  }

  // Send email to driver
  try {
    await sendEmail({
      to: check.driverEmail,
      subject,
      html: emailBody,
      text: emailBody.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
    })
  } catch (error) {
    console.error(`Failed to send expiry email to driver ${check.driverId}:`, error)
  }

  // Send SMS for urgent/critical/expired (7 days, 1 day, expired)
  if (['URGENT_7_DAYS', 'CRITICAL_1_DAY', 'EXPIRED'].includes(check.level)) {
    try {
      await sendSMS({
        to: check.driverPhone,
        message: smsMessage,
      })
    } catch (error) {
      console.error(`Failed to send expiry SMS to driver ${check.driverId}:`, error)
    }
  }

  // Send email to fleet owner if applicable
  if (check.fleetOwnerEmail && check.fleetOwnerId) {
    const fleetEmailBody = `
      <h2>Fleet Vehicle Registration Alert</h2>
      <p><strong>Driver:</strong> ${check.driverName}</p>
      <p><strong>Vehicle:</strong> ${check.vehiclePlate}</p>
      <p><strong>Expires:</strong> ${check.expiryDate.toLocaleDateString()} (${check.daysUntilExpiry} days)</p>
      <p>Please ensure this vehicle's registration is renewed promptly.</p>
      <a href="${baseUrl}/driver/business?tab=team" style="display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Fleet</a>
    `
    try {
      await sendEmail({
        to: check.fleetOwnerEmail,
        subject: `Fleet Alert: ${subject}`,
        html: fleetEmailBody,
        text: fleetEmailBody.replace(/<[^>]*>/g, ''),
      })
    } catch (error) {
      console.error(`Failed to send expiry email to fleet owner ${check.fleetOwnerId}:`, error)
    }
  }

  // Create notification record to prevent duplicates
  await prisma.notification.create({
    data: {
      driverId: check.driverId,
      type: 'VEHICLE_REGISTRATION_EXPIRING',
      title: subject,
      message: emailBody.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
      link: vehicleUrl,
      metadata: JSON.stringify({
        vehicleId: check.vehicleId,
        vehiclePlate: check.vehiclePlate,
        expiryDate: check.expiryDate.toISOString(),
        daysUntilExpiry: check.daysUntilExpiry,
        level: check.level,
      }),
    },
  })
}

/**
 * Daily cron job: Check and send vehicle expiry notifications
 * Should be called daily at midnight
 */
export async function runVehicleExpiryCheck(): Promise<void> {
  console.log('[Vehicle Expiry Check] Starting daily check...')
  
  const notifications = await checkVehicleExpiryNotifications()
  console.log(`[Vehicle Expiry Check] Found ${notifications.length} vehicles needing notifications`)

  for (const check of notifications) {
    try {
      await sendVehicleExpiryNotification(check)
      console.log(`[Vehicle Expiry Check] Sent notification for vehicle ${check.vehiclePlate}`)
    } catch (error) {
      console.error(`[Vehicle Expiry Check] Failed to send notification for vehicle ${check.vehiclePlate}:`, error)
    }
  }

  console.log('[Vehicle Expiry Check] Completed')
}

