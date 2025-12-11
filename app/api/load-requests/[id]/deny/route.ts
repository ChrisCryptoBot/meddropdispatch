import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLoadDeniedNotification } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import type { DriverDenialReason } from '@/lib/types'

/**
 * POST /api/load-requests/[id]/deny
 * Driver denies/declines a load with a reason
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { driverId, reason, notes } = await request.json()

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Denial reason is required' },
        { status: 400 }
      )
    }

    // Get current load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: true,
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!loadRequest) {
      return NextResponse.json(
        { error: 'Load request not found' },
        { status: 404 }
      )
    }

    // Check if load is in a state that can be denied
    // Driver can only deny loads that are REQUESTED (before acceptance)
    if (loadRequest.status !== 'REQUESTED') {
      return NextResponse.json(
        { error: `Cannot deny load with status: ${loadRequest.status}. Load must be REQUESTED.` },
        { status: 400 }
      )
    }

    // Update load with denial information - set to DENIED status
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        driverId: null, // Clear driver assignment
        assignedAt: null,
        acceptedByDriverAt: null,
        status: 'DENIED', // Set to DENIED - doesn't fit schedule
        driverDenialReason: reason as DriverDenialReason,
        driverDenialNotes: notes || null,
        driverDeniedAt: new Date(),
        lastDeniedByDriverId: driverId,
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Get driver info for tracking event
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        firstName: true,
        lastName: true,
      },
    })

    const driverName = driver ? `${driver.firstName} ${driver.lastName}` : 'Driver'

    // Create tracking event for denial
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'DENIED',
        label: `Not Scheduled`,
        description: `This scheduling request could not be accommodated. Reason: ${reason}${notes ? `. Notes: ${notes}` : ''}`,
        locationText: 'MED DROP Driver Portal',
        actorType: 'DRIVER',
        actorId: driverId,
      },
    })

    // Send notification to shipper
    const trackingUrl = getTrackingUrl(updatedLoad.publicTrackingCode)
    await sendLoadDeniedNotification({
      to: updatedLoad.shipper.email,
      companyName: updatedLoad.shipper.companyName,
      trackingCode: updatedLoad.publicTrackingCode,
      reason,
      notes: notes || null,
      trackingUrl,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
      message: 'Load denied. Status set to DENIED.',
    })

  } catch (error) {
    console.error('Error denying load:', error)
    return NextResponse.json(
      { error: 'Failed to deny load', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

