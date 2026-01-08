// Visual Dispatch Board API Endpoint (Fleet Enterprise - Tier 3)
// GET /api/admin/dispatch/board
// Returns drivers with their shifts and assigned loads for Gantt timeline view

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling } from '@/lib/errors'
import { requireAuth } from '@/lib/authorization'

/**
 * GET /api/admin/dispatch/board
 * Get dispatch board data: drivers, their shifts, and assigned loads for timeline view
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    // Verify admin access
    await requireAuth(request)

    // Get current date range (today + next 7 days for timeline)
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfWeek = new Date(startOfToday)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    // Fetch all active drivers with their current shift and assigned loads
    const drivers = await prisma.driver.findMany({
      where: {
        isDeleted: false,
        status: {
          in: ['AVAILABLE', 'ON_ROUTE', 'OFF_DUTY'], // Active statuses
        },
      },
      include: {
        // Get current open shift
        shifts: {
          where: {
            clockOut: null, // Open shifts only
          },
          orderBy: { clockIn: 'desc' },
          take: 1,
        },
        // Get assigned loads scheduled for the next 7 days
        loadRequests: {
          where: {
            status: {
              in: ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'], // Active loads
            },
            OR: [
              { readyTime: { gte: startOfToday, lte: endOfWeek } },
              { assignedAt: { gte: startOfToday, lte: endOfWeek } },
              { driverId: { not: null } }, // Include all assigned loads
            ],
          },
          include: {
            pickupFacility: {
              select: {
                id: true,
                name: true,
                addressLine1: true,
                city: true,
                state: true,
              },
            },
            dropoffFacility: {
              select: {
                id: true,
                name: true,
                addressLine1: true,
                city: true,
                state: true,
              },
            },
            vehicle: {
              select: {
                id: true,
                vehiclePlate: true,
              },
            },
            shipper: {
              select: {
                id: true,
                companyName: true,
              },
            },
            // Get latest GPS tracking point for this load
            gpsTrackingPoints: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
          orderBy: { readyTime: 'asc' },
          take: 100, // PERFORMANCE: Limit loads per driver to prevent excessive queries (40+ vehicle fleets)
        },
        fleet: {
          select: {
            id: true,
            name: true,
          },
        },
        vehicles: {
          where: { isActive: true },
          select: {
            id: true,
            vehiclePlate: true,
            vehicleType: true,
          },
        },
      },
      orderBy: [
        { fleetRole: 'desc' }, // OWNER first, then ADMIN, then DRIVER
        { firstName: 'asc' },
      ],
    })

    // Get unassigned loads (no driver, status = NEW, REQUESTED, QUOTED, QUOTE_ACCEPTED)
    const unassignedLoads = await prisma.loadRequest.findMany({
      where: {
        driverId: null,
        status: {
          in: ['NEW', 'REQUESTED', 'QUOTED', 'QUOTE_ACCEPTED'],
        },
        OR: [
          { readyTime: { gte: startOfToday, lte: endOfWeek } },
          { createdAt: { gte: startOfToday } },
        ],
      },
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
          },
        },
        pickupFacility: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
          },
        },
        dropoffFacility: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: { readyTime: 'asc' },
      take: 200, // SCALABILITY: Increased limit for large fleets (40+ vehicles)
    })

    // Format response for frontend
    const formattedDrivers = drivers.map(driver => ({
      id: driver.id,
      name: `${driver.firstName} ${driver.lastName}`,
      email: driver.email,
      phone: driver.phone,
      status: driver.status,
      fleetId: driver.fleetId,
      fleetName: driver.fleet?.name || null,
      fleetRole: driver.fleetRole,
      vehicleType: driver.vehicleType,
      vehicles: driver.vehicles,
      // Current shift info
      currentShift: driver.shifts[0] ? {
        id: driver.shifts[0].id,
        clockIn: driver.shifts[0].clockIn,
        clockOut: driver.shifts[0].clockOut,
        totalHours: driver.shifts[0].totalHours,
        currentHours: driver.shifts[0].clockOut ? null : 
          Math.round(((now.getTime() - new Date(driver.shifts[0].clockIn).getTime()) / (1000 * 60 * 60)) * 100) / 100,
      } : null,
      // Assigned loads formatted for timeline
      assignedLoads: driver.loadRequests.map(load => ({
        id: load.id,
        trackingCode: load.publicTrackingCode,
        status: load.status,
        readyTime: load.readyTime,
        deliveryDeadline: load.deliveryDeadline,
        assignedAt: load.assignedAt,
        estimatedStartTime: load.readyTime || load.assignedAt,
        estimatedEndTime: load.deliveryDeadline || load.actualDeliveryTime,
        // For timeline bars
        duration: load.deliveryDeadline && load.readyTime 
          ? (new Date(load.deliveryDeadline).getTime() - new Date(load.readyTime).getTime()) / (1000 * 60 * 60) // Hours
          : 2, // Default 2 hours if no times
        pickup: {
          name: load.pickupFacility.name,
          address: `${load.pickupFacility.addressLine1}, ${load.pickupFacility.city}, ${load.pickupFacility.state}`,
          latitude: null, // Will be geocoded from address if needed
          longitude: null,
        },
        dropoff: {
          name: load.dropoffFacility.name,
          address: `${load.dropoffFacility.addressLine1}, ${load.dropoffFacility.city}, ${load.dropoffFacility.state}`,
          latitude: null, // Will be geocoded from address if needed
          longitude: null,
        },
        vehiclePlate: load.vehicle?.vehiclePlate || null,
        shipper: load.shipper?.companyName || 'Unknown',
      })),
      // Latest GPS location (from most recent load with GPS tracking)
      lastKnownLocation: (() => {
        const loadsWithGPS = driver.loadRequests.filter(l => l.gpsTrackingPoints && l.gpsTrackingPoints.length > 0)
        if (loadsWithGPS.length === 0) return null
        const latestLoad = loadsWithGPS.sort((a, b) => {
          const aTime = a.gpsTrackingPoints[0]?.timestamp ? new Date(a.gpsTrackingPoints[0].timestamp).getTime() : 0
          const bTime = b.gpsTrackingPoints[0]?.timestamp ? new Date(b.gpsTrackingPoints[0].timestamp).getTime() : 0
          return bTime - aTime
        })[0]
        const latestPoint = latestLoad.gpsTrackingPoints[0]
        return latestPoint ? {
          latitude: latestPoint.latitude,
          longitude: latestPoint.longitude,
          timestamp: latestPoint.timestamp,
          accuracy: latestPoint.accuracy,
        } : null
      })(),
    }))

    // Format unassigned loads for queue
    const formattedUnassignedLoads = unassignedLoads.map(load => ({
      id: load.id,
      trackingCode: load.publicTrackingCode,
      status: load.status,
      readyTime: load.readyTime,
      deliveryDeadline: load.deliveryDeadline,
      shipper: load.shipper.companyName,
      pickup: {
        name: load.pickupFacility.name,
        address: `${load.pickupFacility.addressLine1}, ${load.pickupFacility.city}, ${load.pickupFacility.state}`,
        latitude: null, // Will be geocoded from address if needed
        longitude: null,
      },
      dropoff: {
        name: load.dropoffFacility.name,
        address: `${load.dropoffFacility.addressLine1}, ${load.dropoffFacility.city}, ${load.dropoffFacility.state}`,
        latitude: null, // Will be geocoded from address if needed
        longitude: null,
      },
      estimatedDuration: load.deliveryDeadline && load.readyTime 
        ? (new Date(load.deliveryDeadline).getTime() - new Date(load.readyTime).getTime()) / (1000 * 60 * 60)
        : 2,
    }))

    return NextResponse.json({
      drivers: formattedDrivers,
      unassignedLoads: formattedUnassignedLoads,
      timeRange: {
        start: startOfToday.toISOString(),
        end: endOfWeek.toISOString(),
      },
    })
  })(request)
}

