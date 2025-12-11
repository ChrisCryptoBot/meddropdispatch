import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDriverAcceptedNotification, sendLoadScheduledNotification } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'

/**
 * POST /api/load-requests/[id]/accept
 * Driver accepts/claims a load
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { driverId } = await request.json()

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    // Get current load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: true,
      },
    })

    if (!loadRequest) {
      return NextResponse.json(
        { error: 'Load request not found' },
        { status: 404 }
      )
    }

    // Check if load is already assigned to another driver
    if (loadRequest.driverId && loadRequest.driverId !== driverId) {
      return NextResponse.json(
        { error: 'This load has already been accepted by another driver' },
        { status: 400 }
      )
    }

    // Check if load can be accepted (must be REQUESTED)
    if (loadRequest.status !== 'REQUESTED') {
      return NextResponse.json(
        { error: `Cannot accept load with status: ${loadRequest.status}. Load must be REQUESTED.` },
        { status: 400 }
      )
    }

    // Update load with driver assignment - set to SCHEDULED (tracking starts here)
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        driverId,
        assignedAt: loadRequest.assignedAt || new Date(),
        acceptedByDriverAt: new Date(),
        // Set status to SCHEDULED - driver accepted after phone call, tracking now active
        status: 'SCHEDULED',
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Update the initial "Request Received" event description to reflect acceptance
    // Find the first REQUEST_RECEIVED event and update its description
    const initialEvent = await prisma.trackingEvent.findFirst({
      where: {
        loadRequestId: id,
        code: 'REQUEST_RECEIVED',
      },
      orderBy: { createdAt: 'asc' },
    })

    if (initialEvent) {
      await prisma.trackingEvent.update({
        where: { id: initialEvent.id },
        data: {
          description: 'Your scheduling request has been received. A driver will call shortly to confirm details and pricing.',
        },
      })
    }

    // Create tracking event for scheduling (tracking starts here)
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'SCHEDULED',
        label: `Scheduled`,
        description: `Your delivery has been scheduled. Tracking is now available.`,
        locationText: 'MED DROP Driver Portal',
        actorType: 'DRIVER',
        actorId: driverId,
      },
    })

    // Send email notifications
    const trackingUrl = getTrackingUrl(updatedLoad.publicTrackingCode)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const driverPortalUrl = `${baseUrl}/driver/loads`

    // Notify shipper that driver has accepted (driver will call)
    await sendDriverAcceptedNotification({
      to: updatedLoad.shipper.email,
      companyName: updatedLoad.shipper.companyName,
      trackingCode: updatedLoad.publicTrackingCode,
      driverName: `${updatedLoad.driver?.firstName || ''} ${updatedLoad.driver?.lastName || ''}`.trim(),
      driverPhone: updatedLoad.driver?.phone || 'Not provided',
      trackingUrl,
    })

    // Notify both parties that load is scheduled
    await sendLoadScheduledNotification({
      shipperEmail: updatedLoad.shipper.email,
      driverEmail: updatedLoad.driver?.email || null,
      companyName: updatedLoad.shipper.companyName,
      driverName: `${updatedLoad.driver?.firstName || ''} ${updatedLoad.driver?.lastName || ''}`.trim(),
      trackingCode: updatedLoad.publicTrackingCode,
      trackingUrl,
      driverPortalUrl,
      pickupAddress: `${updatedLoad.pickupFacility.addressLine1}, ${updatedLoad.pickupFacility.city}, ${updatedLoad.pickupFacility.state}`,
      dropoffAddress: `${updatedLoad.dropoffFacility.addressLine1}, ${updatedLoad.dropoffFacility.city}, ${updatedLoad.dropoffFacility.state}`,
      readyTime: updatedLoad.readyTime,
      deliveryDeadline: updatedLoad.deliveryDeadline,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
    })

  } catch (error) {
    console.error('Error accepting load:', error)
    return NextResponse.json(
      { error: 'Failed to accept load', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

