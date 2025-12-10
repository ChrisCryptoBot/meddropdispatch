import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Check if load can be accepted (must be QUOTED, QUOTE_ACCEPTED, or NEW)
    const acceptableStatuses = ['NEW', 'QUOTED', 'QUOTE_ACCEPTED']
    if (!acceptableStatuses.includes(loadRequest.status)) {
      return NextResponse.json(
        { error: `Cannot accept load with status: ${loadRequest.status}` },
        { status: 400 }
      )
    }

    // Update load with driver assignment
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        driverId,
        assignedAt: loadRequest.assignedAt || new Date(),
        acceptedByDriverAt: new Date(),
        // Auto-update status to SCHEDULED if not already
        status: loadRequest.status === 'NEW' || loadRequest.status === 'QUOTED' || loadRequest.status === 'QUOTE_ACCEPTED'
          ? 'SCHEDULED'
          : undefined,
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
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
          description: 'Your load request has been received and accepted by a driver.',
        },
      })
    }

    // Create tracking event for driver acceptance
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'SHIPPER_CONFIRMED',
        label: `Accepted by driver: ${updatedLoad.driver?.firstName} ${updatedLoad.driver?.lastName}`,
        description: `Load accepted and scheduled with driver ${updatedLoad.driver?.firstName} ${updatedLoad.driver?.lastName}`,
        locationText: 'MED DROP Driver Portal',
        actorType: 'DRIVER',
        actorId: driverId,
      },
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

