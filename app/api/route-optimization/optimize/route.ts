import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDistance } from '@/lib/distance-calculator'

/**
 * POST /api/route-optimization/optimize
 * Optimize route for multiple selected loads
 * Uses nearest neighbor algorithm with time window constraints
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { loadIds, driverId } = body

    console.log('Route optimization request:', { loadIds, driverId, body })

    if (!loadIds || !Array.isArray(loadIds) || loadIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid load IDs provided', received: body },
        { status: 400 }
      )
    }

    // Fetch all selected loads with facilities
    // Allow all statuses except completed/cancelled (user can optimize any active load)
    const loads = await prisma.loadRequest.findMany({
      where: {
        id: { in: loadIds },
        status: { 
          notIn: ['CANCELLED', 'DELIVERED'] 
        },
      },
      include: {
        pickupFacility: true,
        dropoffFacility: true,
        driver: driverId ? {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        } : false,
      },
    })

    if (loads.length === 0) {
      // Try without status filter to see if loads exist
      const allLoads = await prisma.loadRequest.findMany({
        where: { id: { in: loadIds } },
        select: { id: true, status: true, publicTrackingCode: true },
      })
      
      if (allLoads.length === 0) {
        return NextResponse.json(
          { 
            error: 'No loads found with the provided IDs',
            message: `No loads found with IDs: ${loadIds.join(', ')}`
          },
          { status: 404 }
        )
      }
      
      const statuses = allLoads.map(l => `${l.publicTrackingCode}: ${l.status}`).join(', ')
      return NextResponse.json(
        { 
          error: 'No valid loads found for route optimization',
          message: `All selected loads are cancelled or delivered. Load statuses: ${statuses}`,
          loads: allLoads.map(l => ({ id: l.id, code: l.publicTrackingCode, status: l.status }))
        },
        { status: 400 }
      )
    }

    // Validate that all loads have facilities
    const loadsWithoutFacilities = loads.filter(
      load => !load.pickupFacility || !load.dropoffFacility
    )
    
    if (loadsWithoutFacilities.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some loads are missing facility information',
          message: `Loads ${loadsWithoutFacilities.map(l => l.publicTrackingCode).join(', ')} are missing pickup or delivery facilities`
        },
        { status: 400 }
      )
    }

    // Get driver's current location (if available)
    // For now, we'll use the first pickup location as starting point
    const driverLocation = loads[0]?.pickupFacility
      ? `${loads[0].pickupFacility.addressLine1}, ${loads[0].pickupFacility.city}, ${loads[0].pickupFacility.state}`
      : null

    // Build list of all stops (pickup and delivery for each load)
    interface Stop {
      loadId: string
      loadCode: string
      type: 'pickup' | 'delivery'
      facility: any
      readyTime?: Date | null
      deadline?: Date | null
      serviceType: string
      priority: number // STAT = 3, CRITICAL_STAT = 4, ROUTINE = 1
    }

    const stops: Stop[] = []
    loads.forEach((load) => {
      // Calculate priority based on service type
      let priority = 1
      if (load.serviceType === 'STAT') priority = 3
      if (load.serviceType === 'CRITICAL_STAT') priority = 4

      // Add pickup stop
      stops.push({
        loadId: load.id,
        loadCode: load.publicTrackingCode,
        type: 'pickup',
        facility: load.pickupFacility,
        readyTime: load.readyTime,
        deadline: null,
        serviceType: load.serviceType,
        priority,
      })

      // Add delivery stop
      stops.push({
        loadId: load.id,
        loadCode: load.publicTrackingCode,
        type: 'delivery',
        facility: load.dropoffFacility,
        readyTime: null,
        deadline: load.deliveryDeadline,
        serviceType: load.serviceType,
        priority,
      })
    })

    // Sort stops by priority and time windows
    stops.sort((a, b) => {
      // First, sort by priority (higher priority first)
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      // Then by ready time (earlier first)
      if (a.readyTime && b.readyTime) {
        return new Date(a.readyTime).getTime() - new Date(b.readyTime).getTime()
      }
      if (a.readyTime) return -1
      if (b.readyTime) return 1
      // Then by deadline (earlier first)
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
      if (a.deadline) return -1
      if (b.deadline) return 1
      return 0
    })

    // Optimize route using nearest neighbor with constraints
    const optimizedRoute: any[] = []
    const visitedStops = new Set<string>()
    let currentLocation = driverLocation || (stops[0]?.facility 
      ? `${stops[0].facility.addressLine1}, ${stops[0].facility.city}, ${stops[0].facility.state}`
      : null)

    // Track which loads have been picked up (can't deliver before pickup)
    const pickedUpLoads = new Set<string>()

    while (optimizedRoute.length < stops.length) {
      let bestStop: Stop | null = null
      let bestDistance = Infinity
      let bestIndex = -1

      // Find nearest unvisited stop that meets constraints
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i]
        const stopKey = `${stop.loadId}-${stop.type}`

        // Skip if already visited
        if (visitedStops.has(stopKey)) continue

        // Can't deliver before pickup
        if (stop.type === 'delivery' && !pickedUpLoads.has(stop.loadId)) {
          continue
        }

        // Calculate distance from current location
        if (currentLocation) {
          const stopAddress = `${stop.facility.addressLine1}, ${stop.facility.city}, ${stop.facility.state}`
          
          try {
            const distanceResult = await calculateDistance(currentLocation, stopAddress)
            if (distanceResult.success) {
              const distance = distanceResult.distance
              
              // Check time window constraints
              const now = new Date()
              const readyTime = stop.readyTime ? new Date(stop.readyTime) : null
              const deadline = stop.deadline ? new Date(stop.deadline) : null
              
              // If ready time hasn't passed yet, add penalty
              let timePenalty = 0
              if (readyTime && now < readyTime) {
                timePenalty = (readyTime.getTime() - now.getTime()) / (1000 * 60 * 60) // hours
              }

              // Calculate score (lower is better)
              // Distance + priority penalty + time penalty
              const score = distance + (4 - stop.priority) * 5 + timePenalty * 2

              if (score < bestDistance) {
                bestDistance = score
                bestStop = stop
                bestIndex = i
              }
            }
          } catch (error) {
            console.error(`Error calculating distance to stop ${i}:`, error)
          }
        } else {
          // No current location, just use first stop
          bestStop = stop
          bestIndex = i
          break
        }
      }

      // If no valid stop found, break
      if (!bestStop || bestIndex === -1) {
        break
      }

      // Add best stop to route
      const stopAddress = `${bestStop.facility.addressLine1}, ${bestStop.facility.city}, ${bestStop.facility.state}`
      optimizedRoute.push({
        loadId: bestStop.loadId,
        loadCode: bestStop.loadCode,
        type: bestStop.type,
        facilityName: bestStop.facility.name,
        address: stopAddress,
        timeWindow: bestStop.readyTime 
          ? `Ready: ${new Date(bestStop.readyTime).toLocaleString()}`
          : bestStop.deadline
          ? `Deadline: ${new Date(bestStop.deadline).toLocaleString()}`
          : null,
        distanceFromPrevious: optimizedRoute.length > 0 ? bestDistance.toFixed(1) : null,
      })

      visitedStops.add(`${bestStop.loadId}-${bestStop.type}`)
      if (bestStop.type === 'pickup') {
        pickedUpLoads.add(bestStop.loadId)
      }
      currentLocation = stopAddress
    }

    // Calculate total distance and time
    let totalDistance = 0
    let totalTime = 0

    for (let i = 1; i < optimizedRoute.length; i++) {
      const prev = optimizedRoute[i - 1]
      const curr = optimizedRoute[i]
      
      try {
        const distanceResult = await calculateDistance(prev.address, curr.address)
        if (distanceResult.success) {
          totalDistance += distanceResult.distance
          totalTime += distanceResult.duration || Math.ceil(distanceResult.distance * 1.5) // Estimate 1.5 min per mile
        }
      } catch (error) {
        console.error('Error calculating total distance:', error)
      }
    }

    return NextResponse.json({
      optimizedRoute,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalTime: `${Math.ceil(totalTime)} min`,
      loadCount: loads.length,
    })

  } catch (error) {
    console.error('Error optimizing route:', error)
    return NextResponse.json(
      { error: 'Failed to optimize route', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

