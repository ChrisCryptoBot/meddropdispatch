import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/load-requests/[id]/assign-driver
 * Assign a driver to a load
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

    // Update load with driver assignment
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        driverId,
        assignedAt: new Date(),
        // Auto-update status if still NEW or QUOTED
        status: {
          set: ['NEW', 'QUOTED', 'QUOTE_ACCEPTED'].includes(
            (await prisma.loadRequest.findUnique({ where: { id }, select: { status: true } }))?.status || ''
          ) ? 'SCHEDULED' : undefined as any
        },
      },
      include: {
        driver: true,
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Create tracking event for driver assignment
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'SHIPPER_CONFIRMED',
        label: `Assigned to driver: ${updatedLoad.driver?.firstName} ${updatedLoad.driver?.lastName}`,
        description: `Load scheduled with driver ${updatedLoad.driver?.firstName} ${updatedLoad.driver?.lastName}`,
        locationText: 'MED DROP Dispatch',
      },
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
    })

  } catch (error) {
    console.error('Error assigning driver:', error)
    return NextResponse.json(
      { error: 'Failed to assign driver', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
