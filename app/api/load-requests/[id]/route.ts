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

    // Get current load to check temperature ranges
    const currentLoad = await prisma.loadRequest.findUnique({
      where: { id },
      select: {
        temperatureMin: true,
        temperatureMax: true,
        status: true,
      }
    })

    // TEMPERATURE EXCEPTION HANDLING
    const updateData: any = { ...data }

    // Check pickup temperature
    if (data.pickupTemperature !== undefined && currentLoad?.temperatureMin !== null && currentLoad?.temperatureMax !== null) {
      const temp = parseFloat(data.pickupTemperature)
      const min = currentLoad.temperatureMin!
      const max = currentLoad.temperatureMax!
      
      if (temp < min || temp > max) {
        updateData.pickupTempException = true
      } else {
        updateData.pickupTempException = false
      }
    }

    // Check delivery temperature
    if (data.deliveryTemperature !== undefined && currentLoad?.temperatureMin !== null && currentLoad?.temperatureMax !== null) {
      const temp = parseFloat(data.deliveryTemperature)
      const min = currentLoad.temperatureMin!
      const max = currentLoad.temperatureMax!
      
      if (temp < min || temp > max) {
        updateData.deliveryTempException = true
      } else {
        updateData.deliveryTempException = false
      }
    }

    // Set attestation timestamps
    if (data.pickupAttested === true) {
      updateData.pickupAttestedAt = new Date()
    }
    if (data.deliveryAttested === true) {
      updateData.deliveryAttestedAt = new Date()
    }

    // Update load request
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        ...updateData,
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
