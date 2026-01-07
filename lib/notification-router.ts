// Email 3: Centralized Notification Router
// Smart routing for fleet notifications (prevents notification noise)
// Implements routing rules from Edge Case Audit

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'

export type NotificationType = 
  | 'OPERATIONAL' // Pickup/Dropoff updates (drivers only)
  | 'EXCEPTION'   // Delays, cancellations (drivers + admins/owners)
  | 'COMPLIANCE'  // Compliance alerts (drivers + owners)
  | 'FINANCIAL'   // Payment/invoice updates (drivers + owners)
  | 'SYSTEM'      // System notifications (all relevant parties)

export interface NotificationTarget {
  driverId?: string
  fleetOwnerId?: string
  fleetAdminIds?: string[]
  shipperId?: string
  adminIds?: string[]
}

export interface NotificationPayload {
  type: NotificationType
  title: string
  message: string
  link?: string
  metadata?: Record<string, any>
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
}

/**
 * Smart notification router
 * Routes notifications based on type and fleet role
 */
export class NotificationRouter {
  /**
   * Route notification to appropriate recipients
   */
  static async route(
    targets: NotificationTarget,
    payload: NotificationPayload
  ): Promise<void> {
    const recipients: Array<{ userId: string; email?: string; phone?: string; type: 'DRIVER' | 'FLEET_OWNER' | 'FLEET_ADMIN' | 'SHIPPER' | 'ADMIN' }> = []

    // OPERATIONAL: Only drivers get operational pings
    if (payload.type === 'OPERATIONAL') {
      if (targets.driverId) {
        const driver = await prisma.driver.findUnique({
          where: { id: targets.driverId },
          select: { id: true, email: true, phone: true },
        })
        if (driver) {
          recipients.push({ userId: driver.id, email: driver.email, phone: driver.phone, type: 'DRIVER' })
        }
      }
    }

    // EXCEPTION: Drivers + Fleet Owners/Admins
    if (payload.type === 'EXCEPTION') {
      if (targets.driverId) {
        const driver = await prisma.driver.findUnique({
          where: { id: targets.driverId },
          select: { id: true, email: true, phone: true },
        })
        if (driver) {
          recipients.push({ userId: driver.id, email: driver.email, phone: driver.phone, type: 'DRIVER' })
        }
      }

      // Fleet owner gets exception notifications
      if (targets.fleetOwnerId) {
        const owner = await prisma.driver.findUnique({
          where: { id: targets.fleetOwnerId },
          select: { id: true, email: true, phone: true },
        })
        if (owner) {
          recipients.push({ userId: owner.id, email: owner.email, phone: owner.phone, type: 'FLEET_OWNER' })
        }
      }

      // Fleet admins get exception notifications
      if (targets.fleetAdminIds && targets.fleetAdminIds.length > 0) {
        const admins = await prisma.driver.findMany({
          where: { id: { in: targets.fleetAdminIds } },
          select: { id: true, email: true, phone: true },
        })
        for (const admin of admins) {
          recipients.push({ userId: admin.id, email: admin.email, phone: admin.phone, type: 'FLEET_ADMIN' })
        }
      }
    }

    // COMPLIANCE: Drivers + Fleet Owners
    if (payload.type === 'COMPLIANCE') {
      if (targets.driverId) {
        const driver = await prisma.driver.findUnique({
          where: { id: targets.driverId },
          select: { id: true, email: true, phone: true },
        })
        if (driver) {
          recipients.push({ userId: driver.id, email: driver.email, phone: driver.phone, type: 'DRIVER' })
        }
      }

      if (targets.fleetOwnerId) {
        const owner = await prisma.driver.findUnique({
          where: { id: targets.fleetOwnerId },
          select: { id: true, email: true, phone: true },
        })
        if (owner) {
          recipients.push({ userId: owner.id, email: owner.email, phone: owner.phone, type: 'FLEET_OWNER' })
        }
      }
    }

    // FINANCIAL: Drivers + Fleet Owners
    if (payload.type === 'FINANCIAL') {
      if (targets.driverId) {
        const driver = await prisma.driver.findUnique({
          where: { id: targets.driverId },
          select: { id: true, email: true, phone: true },
        })
        if (driver) {
          recipients.push({ userId: driver.id, email: driver.email, phone: driver.phone, type: 'DRIVER' })
        }
      }

      if (targets.fleetOwnerId) {
        const owner = await prisma.driver.findUnique({
          where: { id: targets.fleetOwnerId },
          select: { id: true, email: true, phone: true },
        })
        if (owner) {
          recipients.push({ userId: owner.id, email: owner.email, phone: owner.phone, type: 'FLEET_OWNER' })
        }
      }
    }

    // SYSTEM: All relevant parties
    if (payload.type === 'SYSTEM') {
      // Add all targets
      if (targets.driverId) {
        const driver = await prisma.driver.findUnique({
          where: { id: targets.driverId },
          select: { id: true, email: true, phone: true },
        })
        if (driver) {
          recipients.push({ userId: driver.id, email: driver.email, phone: driver.phone, type: 'DRIVER' })
        }
      }

      if (targets.fleetOwnerId) {
        const owner = await prisma.driver.findUnique({
          where: { id: targets.fleetOwnerId },
          select: { id: true, email: true, phone: true },
        })
        if (owner) {
          recipients.push({ userId: owner.id, email: owner.email, phone: owner.phone, type: 'FLEET_OWNER' })
        }
      }
    }

    // Send notifications to all recipients
    for (const recipient of recipients) {
      try {
        // Create in-app notification
        await prisma.notification.create({
          data: {
            driverId: recipient.type === 'DRIVER' || recipient.type === 'FLEET_OWNER' || recipient.type === 'FLEET_ADMIN' ? recipient.userId : null,
            type: payload.type === 'OPERATIONAL' ? 'LOAD_UPDATE' : 
                  payload.type === 'EXCEPTION' ? 'LATE_DELIVERY' :
                  payload.type === 'COMPLIANCE' ? 'COMPLIANCE_EXPIRING' :
                  payload.type === 'FINANCIAL' ? 'PAYMENT_RECEIVED' : 'OTHER',
            title: payload.title,
            message: payload.message,
            link: payload.link,
            metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
          },
        })

        // Send email for HIGH/URGENT priority or EXCEPTION/COMPLIANCE types
        if (recipient.email && (payload.priority === 'HIGH' || payload.priority === 'URGENT' || payload.type === 'EXCEPTION' || payload.type === 'COMPLIANCE')) {
          await sendEmail({
            to: recipient.email,
            subject: payload.title,
            text: payload.message,
            html: `<p>${payload.message}</p>${payload.link ? `<p><a href="${payload.link}">View Details</a></p>` : ''}`,
          })
        }

        // Send SMS for URGENT priority only
        if (recipient.phone && payload.priority === 'URGENT') {
          await sendSMS({
            to: recipient.phone,
            message: `${payload.title}: ${payload.message}${payload.link ? ` ${payload.link}` : ''}`,
          })
        }
      } catch (error) {
        console.error(`Failed to send notification to ${recipient.userId}:`, error)
        // Continue with other recipients
      }
    }
  }
}

