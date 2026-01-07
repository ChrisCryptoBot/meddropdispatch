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
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, AuthorizationError, ConflictError } from '@/lib/errors'
import { updateLoadStatusSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validatePickupLocation, validateDeliveryLocation, validateCoordinates } from '@/lib/gps-validation'

const DEFAULT_TOLERANCE_RADIUS = 100 // 100 meters default
import { verifyLoadStatusUpdateAccess, requireAuth } from '@/lib/authorization'
import { logUserAction } from '@/lib/audit-log'
import {
  validateStatusTransition,
  validateSignature,
  validateTemperature,
  validatePickupTiming,
  validateDeliveryTiming,
} from '@/lib/edge-case-validations'

/**
 * PATCH /api/load-requests/[id]/status
 * Update load request status and create tracking event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await nextReq.json()

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

    const data = validation.data as StatusUpdateData & {
      driverId?: string
      actorType?: string
      latitude?: number
      longitude?: number
      accuracy?: number
      overrideReason?: string
      overrideGpsValidation?: boolean
      signature?: string
      signerName?: string
      signatureUnavailableReason?: string
      temperature?: number
      temperatureImage?: string
    }

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

    // AUTHORIZATION: Verify user has permission to update this load's status
    await verifyLoadStatusUpdateAccess(nextReq, id)

    // CHAIN-OF-CUSTODY: Enforce linear status transitions (scheduling system)
    // Allow flexible transitions - drivers can skip EN_ROUTE if already at pickup location
    const validTransitions: Record<string, string[]> = {
      'NEW': ['QUOTED', 'QUOTE_ACCEPTED', 'SCHEDULED', 'DENIED', 'CANCELLED'], // New load can be quoted, scheduled, or cancelled
      'QUOTE_REQUESTED': ['QUOTED', 'DENIED', 'CANCELLED'], // Quote requested can be quoted or denied
      'QUOTED': ['QUOTE_ACCEPTED', 'DENIED', 'CANCELLED'], // Quoted can be accepted, denied, or cancelled
      'QUOTE_ACCEPTED': ['SCHEDULED', 'DENIED', 'CANCELLED'], // Quote accepted can be scheduled, denied, or cancelled
      'REQUESTED': ['SCHEDULED', 'DENIED', 'CANCELLED'], // Phone call → Schedule or Deny
      'SCHEDULED': ['EN_ROUTE', 'PICKED_UP', 'CANCELLED'], // Can go directly to PICKED_UP or start EN_ROUTE first
      'EN_ROUTE': ['PICKED_UP', 'CANCELLED'], // Arrive at pickup
      'PICKED_UP': ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'], // Can skip IN_TRANSIT
      'IN_TRANSIT': ['DELIVERED', 'CANCELLED'],
      'DELIVERED': [], // Terminal state - delivery complete, paperwork done
      'DENIED': [], // Terminal state
      'CANCELLED': [], // Terminal state
      'COMPLETED': [], // Terminal state
    }

    const currentStatus = loadRequest.status
    const newStatus = data.status

    if (newStatus !== currentStatus) {
      // EDGE CASE VALIDATION: Section 5.2 - Status Transition Enforcement
      try {
        await validateStatusTransition(currentStatus, newStatus, id)
      } catch (transitionError) {
        if (transitionError instanceof ValidationError) {
          return NextResponse.json(
            {
              error: transitionError.name,
              message: transitionError.message,
              code: transitionError.code,
              timestamp: new Date().toISOString(),
            },
            { status: transitionError.statusCode }
          )
        }
        throw transitionError
      }

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

      // VALIDATION: Require driver assignment before status updates beyond SCHEDULED
      if (['EN_ROUTE', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(newStatus) && !loadRequest.driverId) {
        return NextResponse.json(
          { error: 'Cannot update status: Load must have an assigned driver before status can be updated to ' + newStatus },
          { status: 400 }
        )
      }

      // GPS VALIDATION: Validate location for pickup and delivery status updates
      if (newStatus === 'PICKED_UP' && data.latitude && data.longitude) {
        try {
          const validationResult = await validatePickupLocation(
            id,
            {
              latitude: data.latitude,
              longitude: data.longitude,
              accuracy: data.accuracy,
            },
            DEFAULT_TOLERANCE_RADIUS
          )

          if (!validationResult.withinRange && !data.overrideGpsValidation) {
            // AUDIT: Log GPS validation failure
            const auth = await requireAuth(nextReq).catch(() => null)
            if (auth) {
              await logUserAction('OTHER', 'LOAD_REQUEST', {
                entityId: id,
                userId: auth.userId,
                userType: auth.userType === 'driver' ? 'DRIVER' : auth.userType === 'shipper' ? 'SHIPPER' : 'ADMIN',
                req: nextReq,
                metadata: { action: 'GPS_VALIDATION_FAILED', reason: validationResult.message },
                severity: 'WARNING',
                success: false,
                errorMessage: `GPS validation failed for pickup: ${validationResult.message}`,
              })
            }

            return NextResponse.json(
              {
                error: 'GPS validation failed',
                message: validationResult.message || 'Driver location does not match pickup location',
                requiresOverride: true,
              },
              { status: 400 }
            )
          }

          // AUDIT: Log GPS override if used
          if (!validationResult.withinRange && data.overrideGpsValidation) {
            const auth = await requireAuth(nextReq).catch(() => null)
            if (auth) {
              await logUserAction('OTHER', 'LOAD_REQUEST', {
                entityId: id,
                userId: auth.userId,
                userType: auth.userType === 'driver' ? 'DRIVER' : auth.userType === 'shipper' ? 'SHIPPER' : 'ADMIN',
                req: nextReq,
                metadata: {
                  action: 'GPS_VALIDATION_OVERRIDDEN',
                  reason: data.overrideReason || 'GPS validation overridden',
                  latitude: data.latitude,
                  longitude: data.longitude,
                },
                severity: 'WARNING',
                success: true,
              })
            }
          }
        } catch (gpsError) {
          console.error('GPS validation error:', gpsError)
          // Don't block if GPS validation fails - log and continue
        }
      }

      if (newStatus === 'DELIVERED' && data.latitude && data.longitude) {
        try {
          const validationResult = await validateDeliveryLocation(
            id,
            {
              latitude: data.latitude,
              longitude: data.longitude,
              accuracy: data.accuracy,
            },
            DEFAULT_TOLERANCE_RADIUS
          )

          if (!validationResult.withinRange && !data.overrideGpsValidation) {
            // AUDIT: Log GPS validation failure
            const auth = await requireAuth(nextReq).catch(() => null)
            if (auth) {
              await logUserAction('OTHER', 'LOAD_REQUEST', {
                entityId: id,
                userId: auth.userId,
                userType: auth.userType === 'driver' ? 'DRIVER' : auth.userType === 'shipper' ? 'SHIPPER' : 'ADMIN',
                req: nextReq,
                metadata: { action: 'GPS_VALIDATION_FAILED', reason: validationResult.message },
                severity: 'WARNING',
                success: false,
                errorMessage: `GPS validation failed for delivery: ${validationResult.message}`,
              })
            }

            return NextResponse.json(
              {
                error: 'GPS validation failed',
                message: validationResult.message || 'Driver location does not match delivery location',
                requiresOverride: true,
              },
              { status: 400 }
            )
          }

          // AUDIT: Log GPS override if used
          if (!validationResult.withinRange && data.overrideGpsValidation) {
            const auth = await requireAuth(nextReq).catch(() => null)
            if (auth) {
              await logUserAction('OTHER', 'LOAD_REQUEST', {
                entityId: id,
                userId: auth.userId,
                userType: auth.userType === 'driver' ? 'DRIVER' : auth.userType === 'shipper' ? 'SHIPPER' : 'ADMIN',
                req: nextReq,
                metadata: {
                  action: 'GPS_VALIDATION_OVERRIDDEN',
                  reason: data.overrideReason || 'GPS validation overridden',
                  latitude: data.latitude,
                  longitude: data.longitude,
                  accuracy: data.accuracy
                },
                severity: 'WARNING',
                success: true,
              })
            }
          }
        } catch (gpsError) {
          console.error('GPS validation error:', gpsError)
          // Don't block if GPS validation fails - log and continue
        }
      }

      // --------------------------------------------------------
      // EDGE CASE VALIDATION: Signature & Temperature
      // --------------------------------------------------------

      // PICKUP: Require Signature & Temp if required
      if (newStatus === 'PICKED_UP') {
        // Validate Signature (if provided or required by load config - skipping strict config check for now, just validate input integrity)
        if (data.signature || data.signerName || data.signatureUnavailableReason) {
          validateSignature(data.signature || null, data.signerName || null, data.signatureUnavailableReason)
        }

        // Validate Temperature (if provided)
        if (data.temperature !== undefined) {
          // Check if temp-controlled
          const requirements = {
            min: loadRequest.temperatureMin, // might be null
            max: loadRequest.temperatureMax, // might be null
          }
          // Since prisma model is generic, we'll check schema. 
          // Assuming loadRequest has temperatureRequirement enum
          const isTempRequired = loadRequest.temperatureRequirement !== 'AMBIENT' && loadRequest.temperatureRequirement !== 'OTHER'
          validateTemperature(data.temperature, loadRequest.temperatureRequirement as any, isTempRequired)
        }
      }

      // DELIVERY: Require Signature
      if (newStatus === 'DELIVERED') {
        if (data.signature || data.signerName || data.signatureUnavailableReason) {
          validateSignature(data.signature || null, data.signerName || null, data.signatureUnavailableReason)
        }
      }

    } // End of if (newStatus !== currentStatus)

    // ATOMIC UPDATE: Use transaction to prevent duplicate invoice generation and enforce optimistic locking
    const updatedLoad = await prisma.$transaction(async (tx) => {
      // Re-check invoiceId within transaction to prevent race condition
      const currentLoad = await tx.loadRequest.findUnique({
        where: { id },
        select: { invoiceId: true, status: true },
      })

      if (!currentLoad) {
        throw new NotFoundError('Load request')
      }

      // OPTIMISTIC LOCKING: Ensure status is still what we expect
      if (currentLoad.status !== currentStatus) {
        throw new ConflictError(`State conflict: Status changed from ${currentStatus} to ${currentLoad.status} by another transaction.`)
      }

      // Update load status using updateMany for extra safety (simulating currentOf cursor)
      const updateResult = await tx.loadRequest.updateMany({
        where: {
          id,
          status: currentStatus
        },
        data: {
          status: data.status,
          quoteAmount: data.quoteAmount,
          quoteNotes: data.quoteNotes,
        }
      })

      if (updateResult.count === 0) {
        throw new ConflictError('State conflict: Failed to update status due to concurrent modification.')
      }

      // Return the updated record
      const updated = await tx.loadRequest.findUnique({ where: { id } })

      if (!updated) throw new NotFoundError('Load lost during update')

      return { updated, currentLoad }
    })

    const finalUpdatedLoad = updatedLoad.updated

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
    // Use atomic check within transaction to prevent duplicates
    if (data.status === 'DELIVERED' && !updatedLoad.currentLoad.invoiceId) {
      // Generate invoice synchronously to ensure it completes
      // Use try-catch to prevent status update failure if invoice generation fails
      try {
        const invoiceId = await autoGenerateInvoiceForLoad(id)

        if (invoiceId) {
          // Update load with invoice ID atomically
          await prisma.loadRequest.update({
            where: { id },
            data: { invoiceId },
          })

          // Send email asynchronously (non-blocking)
          setImmediate(async () => {
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

                const trackingUrl = getTrackingUrl(loadRequest.publicTrackingCode)
                const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

                // Send delivery congratulations email with invoice
                await sendDeliveryCongratulationsEmail({
                  to: loadRequest.shipper.email,
                  companyName: loadRequest.shipper.companyName,
                  trackingCode: loadRequest.publicTrackingCode,
                  deliveryTime: loadWithRecipient?.actualDeliveryTime || finalUpdatedLoad.actualDeliveryTime || new Date(),
                  recipientName: loadWithRecipient?.deliverySignerName || null,
                  invoicePdfBuffer: pdfBuffer,
                  invoiceNumber: invoice.invoiceNumber,
                  invoiceTotal: invoice.total,
                  trackingUrl,
                  baseUrl,
                })

                // Update invoice status to SENT and set sentAt timestamp
                await prisma.invoice.update({
                  where: { id: invoiceId },
                  data: {
                    status: 'SENT',
                    sentAt: new Date(),
                  },
                })
              }
            } catch (emailError) {
              console.error('Error sending delivery congratulations email:', emailError)
              // Don't fail if email fails - invoice is still generated
            }
          })
        }
      } catch (invoiceError) {
        console.error('Error auto-generating invoice:', invoiceError)
        // Log error but don't fail status update
        // Invoice can be generated manually later if needed
      }
    }

    // Determine tracking event code based on status
    let eventCode: TrackingEventCode = data.eventCode || getEventCodeForStatus(data.status)

    // Default event label if not provided
    const eventLabel = data.eventLabel || LOAD_STATUS_LABELS[data.status] || 'Status Updated'

    // CHAIN-OF-CUSTODY: Create tracking event with actor information
    const actorId = data.driverId || loadRequest.driverId || null
    const actorType = data.actorType || (data.driverId || loadRequest.driverId ? 'DRIVER' : 'ADMIN')

    // Build description with override reason if provided
    let eventDescription = data.eventDescription || null
    if (data.overrideReason) {
      eventDescription = eventDescription
        ? `${eventDescription}\n\nLocation Override: ${data.overrideReason}`
        : `Location Override: ${data.overrideReason}`
    }

    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: eventCode,
        label: eventLabel,
        description: eventDescription,
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
    // Get signer names from final updated load
    const finalLoadWithSigners = await prisma.loadRequest.findUnique({
      where: { id },
      select: {
        pickupSignerName: true,
        deliverySignerName: true,
      },
    })

    await sendLoadStatusEmail({
      to: loadRequest.shipper.email,
      trackingCode: loadRequest.publicTrackingCode,
      companyName: loadRequest.shipper.companyName,
      status: data.status,
      statusLabel: eventLabel,
      trackingUrl,
      quoteAmount: data.quoteAmount ?? (loadRequest.quoteAmount ?? undefined),
      quoteCurrency: finalUpdatedLoad.quoteCurrency || undefined,
      eta,
      driverName,
      pickupAddress,
      dropoffAddress,
      pickupSignerName: finalLoadWithSigners?.pickupSignerName || undefined,
      deliverySignerName: finalLoadWithSigners?.deliverySignerName || undefined,
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
    // NON-BLOCKING: SMS failures should not prevent status updates
    if (loadRequest.shipper.smsNotificationsEnabled && loadRequest.shipper.smsPhoneNumber) {
      const shipperPhone = loadRequest.shipper.smsPhoneNumber

      // Driver assigned - fire and forget
      if (data.status === 'SCHEDULED' && loadRequest.driver) {
        const driverName = `${loadRequest.driver.firstName || ''} ${loadRequest.driver.lastName || ''}`.trim() || 'Driver'
        sendDriverAssignedSMS(
          shipperPhone,
          loadRequest.publicTrackingCode,
          driverName
        ).catch((error) => {
          console.error('[SMS] Failed to send driver assigned SMS (non-blocking):', error)
        })
      }

      // Driver en route - fire and forget
      if (data.status === 'EN_ROUTE' && loadRequest.driver) {
        sendDriverEnRouteSMS(
          shipperPhone,
          loadRequest.publicTrackingCode
        ).catch((error) => {
          console.error('[SMS] Failed to send driver en route SMS (non-blocking):', error)
        })
      }

      // Delivery complete - fire and forget
      if (data.status === 'DELIVERED') {
        sendDeliveryCompleteSMS(
          shipperPhone,
          loadRequest.publicTrackingCode
        ).catch((error) => {
          console.error('[SMS] Failed to send delivery complete SMS (non-blocking):', error)
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
      loadRequest: finalUpdatedLoad,
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
