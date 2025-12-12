// Notification Helper Functions
// Creates in-app notifications for drivers and admins

import { prisma } from './prisma'

export type NotificationType =
  | 'QUOTE_REQUEST'
  | 'LOAD_UPDATE'
  | 'DRIVER_DENIAL'
  | 'LATE_DELIVERY'
  | 'COMPLIANCE_EXPIRING'
  | 'PAYMENT_RECEIVED'
  | 'SHIPPER_REQUEST_CALL'
  | 'NEW_LOAD_ASSIGNED'
  | 'LOAD_CANCELLED'
  | 'DOCUMENT_UPLOADED'
  | 'LOAD_STATUS_CHANGED'
  | 'QUOTE_APPROVED'
  | 'QUOTE_REJECTED'
  | 'OTHER'

interface CreateNotificationParams {
  type: NotificationType
  title: string
  message: string
  link?: string
  userId?: string
  driverId?: string
  loadRequestId?: string
  metadata?: Record<string, any>
}

/**
 * Create a notification for a user or driver
 */
export async function createNotification({
  type,
  title,
  message,
  link,
  userId,
  driverId,
  loadRequestId,
  metadata,
}: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      type,
      title,
      message,
      link,
      userId: userId || null,
      driverId: driverId || null,
      loadRequestId: loadRequestId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}

/**
 * Create notification for driver when shipper requests a call
 */
export async function notifyDriverShipperRequestedCall({
  driverId,
  loadRequestId,
  shipperName,
  shipperPhone,
  trackingCode,
}: {
  driverId: string
  loadRequestId: string
  shipperName: string
  shipperPhone: string
  trackingCode: string
}) {
  return createNotification({
    type: 'SHIPPER_REQUEST_CALL',
    title: 'Call Request from Shipper',
    message: `${shipperName} is requesting a call regarding load ${trackingCode}. Please call when safe to do so.`,
    link: `/driver/loads/${loadRequestId}`,
    driverId,
    loadRequestId,
    metadata: {
      shipperName,
      shipperPhone,
      trackingCode,
    },
  })
}

/**
 * Create notification for driver when new load is assigned
 */
export async function notifyDriverLoadAssigned({
  driverId,
  loadRequestId,
  trackingCode,
  shipperName,
}: {
  driverId: string
  loadRequestId: string
  trackingCode: string
  shipperName: string
}) {
  return createNotification({
    type: 'NEW_LOAD_ASSIGNED',
    title: 'New Load Assigned',
    message: `You have been assigned a new load: ${trackingCode} for ${shipperName}`,
    link: `/driver/loads/${loadRequestId}`,
    driverId,
    loadRequestId,
  })
}

/**
 * Create notification for driver when load is cancelled
 */
export async function notifyDriverLoadCancelled({
  driverId,
  loadRequestId,
  trackingCode,
  reason,
}: {
  driverId: string
  loadRequestId: string
  trackingCode: string
  reason?: string
}) {
  return createNotification({
    type: 'LOAD_CANCELLED',
    title: 'Load Cancelled',
    message: `Load ${trackingCode} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
    link: `/driver/loads/${loadRequestId}`,
    driverId,
    loadRequestId,
  })
}

/**
 * Create notification for driver when shipper uploads a document
 */
export async function notifyDriverDocumentUploaded({
  driverId,
  loadRequestId,
  trackingCode,
  documentType,
  uploadedBy,
}: {
  driverId: string
  loadRequestId: string
  trackingCode: string
  documentType: string
  uploadedBy: string
}) {
  return createNotification({
    type: 'DOCUMENT_UPLOADED',
    title: 'New Document Uploaded',
    message: `${uploadedBy} uploaded a ${documentType} for load ${trackingCode}`,
    link: `/driver/loads/${loadRequestId}`,
    driverId,
    loadRequestId,
  })
}

/**
 * Create notification for driver when load status changes (important statuses only)
 */
export async function notifyDriverLoadStatusChanged({
  driverId,
  loadRequestId,
  trackingCode,
  oldStatus,
  newStatus,
  statusLabel,
}: {
  driverId: string
  loadRequestId: string
  trackingCode: string
  oldStatus: string
  newStatus: string
  statusLabel: string
}) {
  // Only notify for important status changes (not every minor update)
  const importantStatuses = ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']
  
  if (!importantStatuses.includes(newStatus)) {
    return null // Don't create notification for minor status changes
  }

  return createNotification({
    type: 'LOAD_STATUS_CHANGED',
    title: `Load Status: ${statusLabel}`,
    message: `Load ${trackingCode} status changed to ${statusLabel}`,
    link: `/driver/loads/${loadRequestId}`,
    driverId,
    loadRequestId,
  })
}

/**
 * Create notification for driver when quote is approved/rejected
 */
export async function notifyDriverQuoteDecision({
  driverId,
  loadRequestId,
  trackingCode,
  decision,
}: {
  driverId: string
  loadRequestId: string
  trackingCode: string
  decision: 'APPROVED' | 'REJECTED'
}) {
  return createNotification({
    type: decision === 'APPROVED' ? 'QUOTE_APPROVED' : 'QUOTE_REJECTED',
    title: decision === 'APPROVED' ? 'Quote Approved' : 'Quote Rejected',
    message: `Your quote for load ${trackingCode} has been ${decision.toLowerCase()}`,
    link: `/driver/loads/${loadRequestId}`,
    driverId,
    loadRequestId,
  })
}

/**
 * Create notification for ALL drivers when company email receives a message
 * This is used for potential leads contacting via email
 */
export async function notifyAllDriversCompanyEmailReceived({
  fromEmail,
  subject,
  message,
  trackingCode,
  loadRequestId,
}: {
  fromEmail: string
  subject: string
  message: string
  trackingCode?: string
  loadRequestId?: string
}) {
  const { prisma } = await import('./prisma')
  
  // Get all active drivers
  const drivers = await prisma.driver.findMany({
    where: { isActive: true },
    select: { id: true },
  })

  // Create notification for each driver
  const notifications = await Promise.all(
    drivers.map((driver) =>
      createNotification({
        type: 'QUOTE_REQUEST',
        title: `New Email Lead: ${subject}`,
        message: `Email received from ${fromEmail}. This may be a potential lead requesting a shipment.${trackingCode ? ` Tracking: ${trackingCode}` : ''}`,
        link: loadRequestId ? `/driver/loads/${loadRequestId}` : '/driver/dashboard',
        driverId: driver.id,
        loadRequestId: loadRequestId || null,
        metadata: {
          fromEmail,
          subject,
          message: message.substring(0, 200), // Truncate for metadata
        },
      })
    )
  )

  return notifications
}

