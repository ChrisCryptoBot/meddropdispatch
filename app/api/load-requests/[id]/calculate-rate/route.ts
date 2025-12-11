// Calculate Rate API Route
// POST: Calculate or recalculate rate for a load request

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDistance } from '@/lib/distance-calculator'
import { calculateRate } from '@/lib/rate-calculator'
import { geocodeAddress } from '@/lib/geocoding'

/**
 * POST /api/load-requests/[id]/calculate-rate
 * Calculate distance and suggested rate for a load request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get load request with facilities
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
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

    // Build address strings
    const pickupAddress = `${loadRequest.pickupFacility.addressLine1}, ${loadRequest.pickupFacility.city}, ${loadRequest.pickupFacility.state} ${loadRequest.pickupFacility.postalCode}`
    const dropoffAddress = `${loadRequest.dropoffFacility.addressLine1}, ${loadRequest.dropoffFacility.city}, ${loadRequest.dropoffFacility.state} ${loadRequest.dropoffFacility.postalCode}`

    // Calculate distance
    const distanceResult = await calculateDistance(pickupAddress, dropoffAddress)

    if (!distanceResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to calculate distance',
          details: distanceResult.error,
        },
        { status: 400 }
      )
    }

    // Calculate rate based on distance and service type
    const rateResult = calculateRate(
      distanceResult.distance,
      loadRequest.serviceType
    )

    // Update load request with calculated values
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        autoCalculatedDistance: distanceResult.distance,
        autoCalculatedTime: distanceResult.duration,
        suggestedRateMin: rateResult.suggestedRateMin,
        suggestedRateMax: rateResult.suggestedRateMax,
      },
    })

    return NextResponse.json({
      success: true,
      calculation: {
        distance: distanceResult.distance,
        duration: distanceResult.duration,
        suggestedRateMin: rateResult.suggestedRateMin,
        suggestedRateMax: rateResult.suggestedRateMax,
        breakdown: rateResult.breakdown,
      },
      loadRequest: updatedLoad,
    })
  } catch (error) {
    console.error('Error calculating rate:', error)
    return NextResponse.json(
      { error: 'Failed to calculate rate' },
      { status: 500 }
    )
  }
}

