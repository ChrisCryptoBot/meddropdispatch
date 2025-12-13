import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDistance } from '@/lib/distance-calculator'
import { calculateRate, calculateProfitEstimate } from '@/lib/rate-calculator'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/load-requests/calculate-rate-simple
 * Calculate rate without requiring a load ID (for manual loads, quotes, etc.)
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const data = await req.json()
    const { pickupAddress, dropoffAddress, serviceType, driverStartingLocation, driverId, isManualLoad, readyTime, deliveryDeadline } = data

    // Validate addresses are provided and not just empty strings or commas
    const cleanPickupAddress = pickupAddress?.trim().replace(/^,+|,+$/g, '').trim()
    const cleanDropoffAddress = dropoffAddress?.trim().replace(/^,+|,+$/g, '').trim()

    if (!cleanPickupAddress || !cleanDropoffAddress) {
      return NextResponse.json(
        { 
          error: 'Pickup and dropoff addresses are required',
          details: 'Please ensure both pickup and delivery addresses are complete with at least a street address and city.'
        },
        { status: 400 }
      )
    }

    // Check if addresses look too short (likely incomplete)
    if (cleanPickupAddress.length < 10 || cleanDropoffAddress.length < 10) {
      return NextResponse.json(
        { 
          error: 'Addresses appear incomplete',
          details: 'Please provide complete addresses including street, city, and state for accurate distance calculation.'
        },
        { status: 400 }
      )
    }

    // Fetch driver's minimum rate per mile if driverId provided
    let driverMinimumRatePerMile: number | undefined
    if (driverId) {
      try {
        const driver = await prisma.driver.findUnique({
          where: { id: driverId },
          select: { minimumRatePerMile: true },
        })
        driverMinimumRatePerMile = driver?.minimumRatePerMile || undefined
      } catch (error) {
        console.error('Error fetching driver minimum rate:', error)
        // Continue without minimum rate if driver lookup fails
      }
    }

    let totalDistance = 0
    let deadheadDistance = 0
    let loadDistance = 0

    // Calculate deadhead if provided
    if (driverStartingLocation) {
      try {
        const cleanStartingLocation = driverStartingLocation.trim().replace(/^,+|,+$/g, '').trim()
        if (cleanStartingLocation && cleanStartingLocation.length >= 5) {
          const deadheadResult = await calculateDistance(cleanStartingLocation, cleanPickupAddress)
          if (deadheadResult.success) {
            deadheadDistance = deadheadResult.distance
            totalDistance += deadheadDistance
          } else {
            console.warn('Deadhead distance calculation failed:', deadheadResult.error)
          }
        }
      } catch (error) {
        console.error('Error calculating deadhead distance:', error)
        // Continue without deadhead if calculation fails
      }
    }

    // Calculate load distance (pickup to dropoff)
    let loadDistanceResult
    try {
      loadDistanceResult = await calculateDistance(cleanPickupAddress, cleanDropoffAddress)
    } catch (error) {
      console.error('Error calling calculateDistance:', error)
      return NextResponse.json(
        {
          error: 'Failed to calculate load distance',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

    if (!loadDistanceResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to calculate load distance',
          details: loadDistanceResult.error || 'Unable to find route between addresses. Please ensure addresses are complete and valid.',
        },
        { status: 400 }
      )
    }

    loadDistance = loadDistanceResult.distance
    totalDistance = deadheadDistance + loadDistance

    // Validate total distance
    if (totalDistance <= 0) {
      return NextResponse.json(
        {
          error: 'Invalid distance calculated. Please check your addresses.',
          details: `Total distance: ${totalDistance}, Load distance: ${loadDistance}, Deadhead: ${deadheadDistance}`,
        },
        { status: 400 }
      )
    }

    // Calculate rate based on total distance and service type
    // Pass readyTime/deliveryDeadline for after-hours detection
    const rateResult = calculateRate(
      totalDistance, 
      serviceType || 'ROUTINE',
      readyTime,
      deliveryDeadline
    )

    // Calculate rate per mile
    const ratePerMile = totalDistance > 0 ? rateResult.breakdown.total / totalDistance : 0

    // Check if rate meets minimum (if driver has set one)
    let adjustedRate = rateResult.breakdown.total
    let adjustedRatePerMile = ratePerMile
    if (driverMinimumRatePerMile && ratePerMile < driverMinimumRatePerMile) {
      adjustedRate = driverMinimumRatePerMile * totalDistance
      adjustedRatePerMile = driverMinimumRatePerMile
    }

    // Calculate profit estimates (pre-bid)
    const estimatedTimeMinutes = Math.ceil((totalDistance / 45) * 60) // Assume 45 mph average
    const estimatedHours = estimatedTimeMinutes / 60
    const profitEstimate = calculateProfitEstimate({
      rate: adjustedRate,
      totalDistance,
      estimatedTimeMinutes,
      minimumRatePerMile: driverMinimumRatePerMile,
      isManualLoad: isManualLoad === true,
    })

    // Calculate rate per hour
    const ratePerHour = estimatedHours > 0 ? adjustedRate / estimatedHours : 0

    try {
      return NextResponse.json({
        success: true,
        calculation: {
          deadheadDistance: deadheadDistance || undefined,
          loadDistance: loadDistance,
          totalDistance: totalDistance,
          estimatedTimeMinutes: estimatedTimeMinutes,
          estimatedHours: estimatedHours,
          ratePerMile: adjustedRatePerMile,
          ratePerHour: ratePerHour,
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
          },
          driverMinimumRatePerMile: driverMinimumRatePerMile || null,
          rateAdjustedForMinimum: driverMinimumRatePerMile && ratePerMile < driverMinimumRatePerMile,
        },
      })
    } catch (error) {
      console.error('Error in rate calculation response:', error)
      return NextResponse.json(
        {
          error: 'Failed to calculate rate',
          details: error instanceof Error ? error.message : 'Unknown error occurred during calculation',
        },
        { status: 500 }
      )
    }
  })(request)
}

