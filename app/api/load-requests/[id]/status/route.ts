import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLoadStatusEmail, sendDriverLoadStatusEmail } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import { LOAD_STATUS_LABELS, TRACKING_EVENT_LABELS } from '@/lib/constants'
import type { StatusUpdateData } from '@/lib/types'
import type { LoadStatus, TrackingEventCode } from '@/lib/types'

/**
 * PATCH /api/load-requests/[id]/status
 * Update load request status and create tracking event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data: StatusUpdateData & { driverId?: string; actorType?: string; latitude?: number; longitude?: number } = await request.json()

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
    const validTransitions: Record<string, string[]> = {
      'REQUESTED': ['SCHEDULED', 'DENIED'], // Phone call → Schedule or Deny
      'SCHEDULED': ['EN_ROUTE'], // Start driving (tracking active)
      'EN_ROUTE': ['PICKED_UP'], // Arrive at pickup
      'PICKED_UP': ['IN_TRANSIT', 'DELIVERED'], // Can skip IN_TRANSIT
      'IN_TRANSIT': ['DELIVERED'],
      'DELIVERED': ['COMPLETED'],
      'COMPLETED': [], // Terminal state
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
    if (data.status === 'DELIVERED' || data.status === 'COMPLETED') {
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

    // Send notification emails to both shipper and driver at key workflow points
    const trackingUrl = getTrackingUrl(loadRequest.publicTrackingCode)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const driverPortalUrl = `${baseUrl}/driver/loads/${id}`

    // Always notify shipper of status changes
    await sendLoadStatusEmail({
      to: loadRequest.shipper.email,
      trackingCode: loadRequest.publicTrackingCode,
      companyName: loadRequest.shipper.companyName,
      status: data.status,
      statusLabel: eventLabel,
      trackingUrl,
      quoteAmount: data.quoteAmount,
      quoteCurrency: updatedLoad.quoteCurrency,
    })

    // Notify driver at key workflow points (EN_ROUTE, PICKED_UP, IN_TRANSIT, DELIVERED, COMPLETED)
    const driverNotificationStatuses: LoadStatus[] = ['EN_ROUTE', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED']
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

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
    })

  } catch (error) {
    console.error('Error updating load status:', error)
    return NextResponse.json(
      { error: 'Failed to update status', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Map load status to default tracking event code
 */
function getEventCodeForStatus(status: LoadStatus): TrackingEventCode {
  const mapping: Record<LoadStatus, TrackingEventCode> = {
    REQUESTED: 'REQUEST_RECEIVED',
    SCHEDULED: 'SCHEDULED',
    EN_ROUTE: 'EN_ROUTE_PICKUP',
    PICKED_UP: 'PICKED_UP',
    IN_TRANSIT: 'IN_TRANSIT',
    DELIVERED: 'DELIVERED',
    COMPLETED: 'COMPLETED',
    DENIED: 'DENIED',
  }

  return mapping[status] || 'REQUEST_RECEIVED'
}
