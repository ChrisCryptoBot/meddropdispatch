import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/load-requests/[id]
 * Get a single load request with all related data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
        trackingEvents: {
          orderBy: { createdAt: 'desc' }
        },
        documents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!loadRequest) {
      return NextResponse.json(
        { error: 'Load request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(loadRequest)

  } catch (error) {
    console.error('Error fetching load request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch load request', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/load-requests/[id]
 * Update load request fields (signatures, temperatures, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    // Update load request
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        ...data,
        // Convert ISO strings to Date objects if present
        actualPickupTime: data.actualPickupTime ? new Date(data.actualPickupTime) : undefined,
        actualDeliveryTime: data.actualDeliveryTime ? new Date(data.actualDeliveryTime) : undefined,
      }
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
    })

  } catch (error) {
    console.error('Error updating load request:', error)
    return NextResponse.json(
      { error: 'Failed to update load request', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
