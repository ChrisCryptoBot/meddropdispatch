import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLoadStatusEmail, sendDriverLoadStatusEmail } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import { LOAD_STATUS_LABELS, TRACKING_EVENT_LABELS } from '@/lib/constants'
import type { StatusUpdateData } from '@/lib/types'
import type { LoadStatus, TrackingEventCode } from '@/lib/types'
import {
  sendDriverAssignedSMS,
  sendDriverEnRouteSMS,
  sendDeliveryCompleteSMS,
} from '@/lib/sms'
import { autoGenerateInvoiceForLoad } from '@/lib/invoicing'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { updateLoadStatusSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * PATCH /api/load-requests/[id]/status
 * Update load request status and create tracking event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await req.json()
    
    // Validate request body
    const validation = await validateRequest(updateLoadStatusSchema, rawData)
    if (!validation.success) {
      const formatted = formatZodErrors(validation.errors)
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: formatted.message,
          errors: formatted.errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const data = validation.data as StatusUpdateData & { driverId?: string; actorType?: string; latitude?: number; longitude?: number }

    // Get current load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
        driver: true,
      }
    })

    if (!loadRequest) {
      return NextResponse.json(
        { error: 'Load request not found' },
        { status: 404 }
      )
    }

    // CHAIN-OF-CUSTODY: Enforce linear status transitions (scheduling system)
    // Allow flexible transitions - drivers can skip EN_ROUTE if already at pickup location
    const validTransitions: Record<string, string[]> = {
      'REQUESTED': ['SCHEDULED', 'DENIED'], // Phone call → Schedule or Deny
      'SCHEDULED': ['EN_ROUTE', 'PICKED_UP'], // Can go directly to PICKED_UP or start EN_ROUTE first
      'EN_ROUTE': ['PICKED_UP'], // Arrive at pickup
      'PICKED_UP': ['IN_TRANSIT', 'DELIVERED'], // Can skip IN_TRANSIT
      'IN_TRANSIT': ['DELIVERED'],
      'DELIVERED': [], // Terminal state - delivery complete, paperwork done
      'DENIED': [], // Terminal state
    }

    const currentStatus = loadRequest.status
    const newStatus = data.status

    if (newStatus !== currentStatus) {
      const allowedTransitions = validTransitions[currentStatus] || []
      if (!allowedTransitions.includes(newStatus)) {
        return NextResponse.json(
          { error: `Invalid status transition: Cannot change from ${currentStatus} to ${newStatus}. Valid transitions: ${allowedTransitions.join(', ')}` },
          { status: 400 }
        )
      }

      // Enforce required steps (e.g., cannot deliver without picking up)
      if (newStatus === 'DELIVERED' && currentStatus !== 'PICKED_UP' && currentStatus !== 'IN_TRANSIT') {
        return NextResponse.json(
          { error: 'Cannot mark as DELIVERED without first marking as PICKED_UP' },
          { status: 400 }
        )
      }
    }

    // Update load request
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        status: data.status,
        quoteAmount: data.quoteAmount,
        quoteNotes: data.quoteNotes,
      }
    })

    // POD LOCKING: Lock all documents when status becomes DELIVERED
    if (data.status === 'DELIVERED') {
      await prisma.document.updateMany({
        where: {
          loadRequestId: id,
          isLocked: false, // Only lock documents that aren't already locked
        },
        data: {
          isLocked: true,
          lockedAt: new Date(),
        }
      })
    }

    // AUTO-INVOICE: Generate invoice when load is marked as DELIVERED
    // Send delivery congratulations email with invoice attached
    if (data.status === 'DELIVERED' && !loadRequest.invoiceId) {
      // Run asynchronously to avoid blocking the status update
      autoGenerateInvoiceForLoad(id)
        .then(async (invoiceId) => {
          if (invoiceId) {
            try {
              const { sendDeliveryCongratulationsEmail } = await import('@/lib/email')
              const { generateInvoicePDF } = await import('@/lib/invoicing')
              
              // Get invoice details
              const invoice = await prisma.invoice.findUnique({
                where: { id: invoiceId },
                select: {
                  invoiceNumber: true,
                  total: true,
                },
              })

              if (invoice) {
                // Fetch the updated load to get recipient name
                const loadWithRecipient = await prisma.loadRequest.findUnique({
                  where: { id },
                  select: {
                    deliverySignerName: true,
                    actualDeliveryTime: true,
                  },
                })

                // Generate PDF
                const pdfBuffer = await generateInvoicePDF(invoiceId)
                
                // Send delivery congratulations email with invoice
                await sendDeliveryCongratulationsEmail({
                  to: loadRequest.shipper.email,
                  companyName: loadRequest.shipper.companyName,
                  trackingCode: loadRequest.publicTrackingCode,
                  deliveryTime: loadWithRecipient?.actualDeliveryTime || updatedLoad.actualDeliveryTime || new Date(),
                  recipientName: loadWithRecipient?.deliverySignerName || null,
                  invoicePdfBuffer: pdfBuffer,
                  invoiceNumber: invoice.invoiceNumber,
                  invoiceTotal: invoice.total,
                  trackingUrl,
                  baseUrl,
                })
              }
            } catch (emailError) {
              console.error('Error sending delivery congratulations email:', emailError)
              // Don't fail if email fails - invoice is still generated
            }
          }
        })
        .catch((error) => {
          console.error('Error auto-generating invoice:', error)
          // Don't fail the status update if invoice generation fails
        })
    }

    // Determine tracking event code based on status
    let eventCode: TrackingEventCode = data.eventCode || getEventCodeForStatus(data.status)

    // Default event label if not provided
    const eventLabel = data.eventLabel || LOAD_STATUS_LABELS[data.status] || 'Status Updated'

    // CHAIN-OF-CUSTODY: Create tracking event with actor information
    const actorId = data.driverId || loadRequest.driverId || null
    const actorType = data.actorType || (data.driverId || loadRequest.driverId ? 'DRIVER' : 'ADMIN')

    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: eventCode,
        label: eventLabel,
        description: data.eventDescription || null,
        locationText: data.locationText || null,
        actorId: actorId,
        actorType: actorType,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      }
    })

    // Create in-app notification for driver on important status changes
    if (loadRequest.driverId && data.status !== loadRequest.status) {
      const { notifyDriverLoadStatusChanged } = await import('@/lib/notifications')
      await notifyDriverLoadStatusChanged({
        driverId: loadRequest.driverId,
        loadRequestId: id,
        trackingCode: loadRequest.publicTrackingCode,
        oldStatus: loadRequest.status,
        newStatus: data.status,
        statusLabel: eventLabel,
      }).catch((error) => {
        console.error('Error creating driver notification:', error)
        // Don't fail the status update if notification creation fails
      })
    }

    // Send notification emails to both shipper and driver at key workflow points
    const trackingUrl = getTrackingUrl(loadRequest.publicTrackingCode)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const driverPortalUrl = `${baseUrl}/driver/loads/${id}`

    // Calculate ETA based on status and delivery deadline
    let eta: string | null = null
    if (loadRequest.deliveryDeadline) {
      const deadline = new Date(loadRequest.deliveryDeadline)
      const now = new Date()
      const hoursUntilDeadline = Math.max(0, Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)))
      
      if (data.status === 'PICKED_UP' || data.status === 'IN_TRANSIT') {
        if (hoursUntilDeadline < 24) {
          eta = `Within ${hoursUntilDeadline} hour${hoursUntilDeadline !== 1 ? 's' : ''}`
        } else {
          const days = Math.floor(hoursUntilDeadline / 24)
          const hours = hoursUntilDeadline % 24
          eta = `${days} day${days !== 1 ? 's' : ''}${hours > 0 ? ` and ${hours} hour${hours !== 1 ? 's' : ''}` : ''}`
        }
      } else if (data.status === 'EN_ROUTE') {
        eta = `Expected delivery by ${deadline.toLocaleString()}`
      }
    }

    // Get driver name for email
    const driverName = loadRequest.driver 
      ? `${loadRequest.driver.firstName || ''} ${loadRequest.driver.lastName || ''}`.trim() 
      : null

    // Get addresses for email
    const pickupAddress = `${loadRequest.pickupFacility.addressLine1}, ${loadRequest.pickupFacility.city}, ${loadRequest.pickupFacility.state}`
    const dropoffAddress = `${loadRequest.dropoffFacility.addressLine1}, ${loadRequest.dropoffFacility.city}, ${loadRequest.dropoffFacility.state}`

    // Always notify shipper of status changes with enhanced email (ETA, status-specific content)
    await sendLoadStatusEmail({
      to: loadRequest.shipper.email,
      trackingCode: loadRequest.publicTrackingCode,
      companyName: loadRequest.shipper.companyName,
      status: data.status,
      statusLabel: eventLabel,
      trackingUrl,
      quoteAmount: data.quoteAmount || loadRequest.quoteAmount,
      quoteCurrency: updatedLoad.quoteCurrency,
      eta,
      driverName,
      pickupAddress,
      dropoffAddress,
    })

    // Notify driver at key workflow points (EN_ROUTE, PICKED_UP, IN_TRANSIT, DELIVERED)
    const driverNotificationStatuses: LoadStatus[] = ['EN_ROUTE', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']
    if (loadRequest.driver && loadRequest.driver.email && driverNotificationStatuses.includes(data.status)) {
      const driverName = `${loadRequest.driver.firstName || ''} ${loadRequest.driver.lastName || ''}`.trim() || 'Driver'
      await sendDriverLoadStatusEmail({
        to: loadRequest.driver.email,
        driverName,
        trackingCode: loadRequest.publicTrackingCode,
        status: data.status,
        statusLabel: eventLabel,
        companyName: loadRequest.shipper.companyName,
        pickupAddress: `${loadRequest.pickupFacility.addressLine1}, ${loadRequest.pickupFacility.city}, ${loadRequest.pickupFacility.state}`,
        dropoffAddress: `${loadRequest.dropoffFacility.addressLine1}, ${loadRequest.dropoffFacility.city}, ${loadRequest.dropoffFacility.state}`,
        readyTime: loadRequest.readyTime,
        deliveryDeadline: loadRequest.deliveryDeadline,
        driverPortalUrl,
      })
    }

    // Send SMS notifications for critical status updates (if shipper has SMS enabled)
    if (loadRequest.shipper.smsNotificationsEnabled && loadRequest.shipper.smsPhoneNumber) {
      const shipperPhone = loadRequest.shipper.smsPhoneNumber

      // Driver assigned
      if (data.status === 'SCHEDULED' && loadRequest.driver) {
        const driverName = `${loadRequest.driver.firstName || ''} ${loadRequest.driver.lastName || ''}`.trim() || 'Driver'
        await sendDriverAssignedSMS({
          shipperPhone,
          trackingCode: loadRequest.publicTrackingCode,
          driverName,
        })
      }

      // Driver en route
      if (data.status === 'EN_ROUTE' && loadRequest.driver) {
        const driverName = `${loadRequest.driver.firstName || ''} ${loadRequest.driver.lastName || ''}`.trim() || 'Driver'
        await sendDriverEnRouteSMS({
          shipperPhone,
          trackingCode: loadRequest.publicTrackingCode,
          driverName,
        })
      }

      // Delivery complete
      if (data.status === 'DELIVERED') {
        const deliveryTime = new Date().toLocaleString()
        await sendDeliveryCompleteSMS({
          shipperPhone,
          trackingCode: loadRequest.publicTrackingCode,
          deliveryTime,
        })
      }
    }

    // Create in-app notification for admins on critical status changes
    const criticalStatuses: LoadStatus[] = ['DELIVERED', 'DENIED']
    if (criticalStatuses.includes(data.status)) {
      await prisma.notification.create({
        data: {
          userId: null, // Broadcast to all admins
          type: 'LOAD_UPDATE',
          title: `Load ${data.status}: ${loadRequest.publicTrackingCode}`,
          message: `${loadRequest.shipper.companyName} - ${eventLabel}`,
          link: `${baseUrl}/admin/loads/${id}`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
    })
  })(request)
}

/**
 * Helper: Map load status to default tracking event code
 */
function getEventCodeForStatus(status: LoadStatus): TrackingEventCode {
  const mapping: Record<LoadStatus, TrackingEventCode> = {
    QUOTE_REQUESTED: 'REQUEST_RECEIVED',
    REQUESTED: 'REQUEST_RECEIVED',
    SCHEDULED: 'SCHEDULED',
    EN_ROUTE: 'EN_ROUTE_PICKUP',
    PICKED_UP: 'PICKED_UP',
    IN_TRANSIT: 'IN_TRANSIT',
    DELIVERED: 'DELIVERED',
    DENIED: 'DENIED',
  }

  return mapping[status] || 'REQUEST_RECEIVED'
}
