import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDistance } from '@/lib/distance-calculator'
import { calculateRate, calculateProfitEstimate } from '@/lib/rate-calculator'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/load-requests/[id]/calculate-rate
 * Calculate rate for an existing load (without deadhead)
 */
export async function POST(
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
    const data = await req.json().catch(() => ({}))
    const { driverId } = data

    // Get load request with facilities
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        pickupFacility: true,
        dropoffFacility: true,
        driver: {
          select: { minimumRatePerMile: true },
        },
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Build addresses
    const pickupAddress = `${loadRequest.pickupFacility.addressLine1}, ${loadRequest.pickupFacility.city}, ${loadRequest.pickupFacility.state} ${loadRequest.pickupFacility.postalCode}`
    const dropoffAddress = `${loadRequest.dropoffFacility.addressLine1}, ${loadRequest.dropoffFacility.city}, ${loadRequest.dropoffFacility.state} ${loadRequest.dropoffFacility.postalCode}`

    // Calculate load distance (pickup → dropoff)
    const loadDistanceResult = await calculateDistance(pickupAddress, dropoffAddress)
    if (!loadDistanceResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to calculate load distance',
          details: loadDistanceResult.error,
        },
        { status: 400 }
      )
    }

    const loadDistance = loadDistanceResult.distance

    // Calculate rate based on distance and service type
    // Pass readyTime/deliveryDeadline for after-hours detection
    const rateResult = calculateRate(
      loadDistance, 
      loadRequest.serviceType,
      loadRequest.readyTime,
      loadRequest.deliveryDeadline
    )

    // Calculate rate per mile
    const ratePerMile = rateResult.breakdown.total / loadDistance

    // Get driver's minimum rate per mile (from load's driver or provided driverId)
    let driverMinimumRatePerMile: number | undefined
    if (loadRequest.driver?.minimumRatePerMile) {
      driverMinimumRatePerMile = loadRequest.driver.minimumRatePerMile
    } else if (driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { minimumRatePerMile: true },
      })
      driverMinimumRatePerMile = driver?.minimumRatePerMile || undefined
    }

    // Check if rate meets minimum (if driver has set one)
    let adjustedRate = rateResult.breakdown.total
    let adjustedRatePerMile = ratePerMile
    if (driverMinimumRatePerMile && ratePerMile < driverMinimumRatePerMile) {
      adjustedRate = driverMinimumRatePerMile * loadDistance
      adjustedRatePerMile = driverMinimumRatePerMile
    }

    // Calculate profit estimates (pre-bid if not accepted, post-bid if accepted)
    const isAccepted = loadRequest.status !== 'REQUESTED' && loadRequest.status !== 'NEW'
    const estimatedTimeMinutes = Math.ceil((loadDistance / 45) * 60) // Assume 45 mph average
    const profitEstimate = calculateProfitEstimate({
      rate: adjustedRate,
      totalDistance: loadDistance,
      estimatedTimeMinutes,
      minimumRatePerMile: driverMinimumRatePerMile,
      isManualLoad: loadRequest.createdVia === 'DRIVER_MANUAL',
    })

    // Update load request with calculated values
    await prisma.loadRequest.update({
      where: { id },
      data: {
        autoCalculatedDistance: loadDistance,
        totalDistance: loadDistance,
        ratePerMile: adjustedRatePerMile,
      },
    })

    return NextResponse.json({
      success: true,
      calculation: {
        loadDistance: loadDistance,
        totalDistance: loadDistance,
        ratePerMile: adjustedRatePerMile,
        suggestedRateMin: rateResult.suggestedRateMin,
        suggestedRateMax: rateResult.suggestedRateMax,
        breakdown: {
          ...rateResult.breakdown,
          total: adjustedRate, // Use adjusted rate if minimum applies
        },
        profitEstimate: {
          estimatedCosts: profitEstimate.estimatedCosts,
          profit: profitEstimate.profit,
          profitMargin: profitEstimate.profitMargin,
          meetsMinimumRate: profitEstimate.meetsMinimumRate,
          minimumRateRequired: profitEstimate.minimumRateRequired,
          isPostBid: isAccepted, // True if load is already accepted/quoted
        },
        driverMinimumRatePerMile: driverMinimumRatePerMile || null,
        rateAdjustedForMinimum: driverMinimumRatePerMile && ratePerMile < driverMinimumRatePerMile,
      },
    })
  })(request)
}
