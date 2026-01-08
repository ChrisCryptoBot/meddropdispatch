// Driver Shift Clock-Out API Endpoint (Fleet Enterprise - Tier 1)
// PATCH /api/drivers/[id]/shifts/clock-out - Clock out to end shift

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors'
import { requireDriver } from '@/lib/authorization'
import { z } from 'zod'

const clockOutSchema = z.object({
  vehicleId: z.string().min(1).optional(), // Optional - should match clock-in vehicle, validated if provided
  odometerReading: z.number().int().min(0).optional(), // Optional - driver can provide odometer at clock-out
})

/**
 * PATCH /api/drivers/[id]/shifts/clock-out
 * Clock out to end a shift
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const { id: driverId } = await params
    const rawData = await req.json()

    // Validate request body
    const validation = clockOutSchema.safeParse(rawData)
    if (!validation.success) {
      throw new ValidationError('Invalid clock-out data', validation.error.errors)
    }

    const { vehicleId, odometerReading } = validation.data

    // AUTHORIZATION: Verify authenticated driver matches driverId
    const auth = await requireDriver(request)
    if (auth.userId !== driverId) {
      throw new AuthorizationError('Cannot clock out as another driver')
    }

    // Find the current open shift (with vehicle info)
    const currentShift = await prisma.driverShift.findFirst({
      where: { driverId, clockOut: null },
      include: { vehicle: true },
    })

    if (!currentShift) {
      throw new NotFoundError('No active shift found to clock out from')
    }

    // Edge Case: Validate vehicle matches clock-in vehicle (if provided)
    if (vehicleId && currentShift.vehicleId && vehicleId !== currentShift.vehicleId) {
      throw new ValidationError('Vehicle must match the vehicle used at clock-in. Please use the same vehicle or contact support.')
    }

    // If vehicleId not provided but shift has one, use shift's vehicle
    const shiftVehicleId = vehicleId || currentShift.vehicleId
    if (!shiftVehicleId) {
      throw new ValidationError('Vehicle information is required for clock-out. Please specify the vehicle.')
    }

    // Verify vehicle belongs to driver and is active
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: shiftVehicleId },
      select: { id: true, currentOdometer: true, driverId: true, isActive: true },
    })

    if (!vehicle || vehicle.driverId !== driverId || !vehicle.isActive) {
      throw new ValidationError('Vehicle not found, inactive, or does not belong to driver')
    }

    // Validate odometer if provided
    if (odometerReading !== undefined) {
      // Odometer should be >= clock-in odometer if available, or >= current vehicle odometer
      const minOdometer = currentShift.clockInOdometer || vehicle.currentOdometer
      if (odometerReading < minOdometer) {
        throw new ValidationError(`Clock-out odometer (${odometerReading}) cannot be less than clock-in odometer (${minOdometer}).`)
      }
      // Also validate against vehicle's current odometer
      if (odometerReading < vehicle.currentOdometer) {
        throw new ValidationError(`Clock-out odometer (${odometerReading}) cannot be less than vehicle's current odometer (${vehicle.currentOdometer}).`)
      }
    }

    // TIER 1.1 - Edge Case 6.3: Prevent Clock Out if active loads
    const activeLoads = await prisma.loadRequest.count({
      where: {
        driverId,
        status: {
          in: ['PICKED_UP', 'IN_TRANSIT'],
        },
      },
    })

    if (activeLoads > 0) {
      throw new ValidationError('Cannot clock out while carrying active shipments. Complete or transfer loads first.')
    }

    const clockOutTime = new Date()
    const totalHours = (clockOutTime.getTime() - currentShift.clockIn.getTime()) / (1000 * 60 * 60)

    // Get current driver status
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { status: true },
    })

    const updatedShift = await prisma.driverShift.update({
      where: { id: currentShift.id },
      data: {
        clockOut: clockOutTime,
        clockOutOdometer: odometerReading || null,
        totalHours: parseFloat(totalHours.toFixed(2)),
      },
    })

    // Update driver status to OFF_DUTY when clocking out
    // Only change if currently AVAILABLE or ON_ROUTE (and no active loads as checked above)
    if (driver && (driver.status === 'AVAILABLE' || driver.status === 'ON_ROUTE')) {
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: 'OFF_DUTY' },
      })
    }

    // TIER 2.1: Update vehicle odometer with manual input if provided
    if (odometerReading !== undefined && vehicle) {
      await prisma.vehicle.update({
        where: { id: shiftVehicleId },
        data: {
          currentOdometer: odometerReading,
          lastManualOdometerEntry: odometerReading,
          lastManualEntryDate: clockOutTime,
        },
      })
    }

    return NextResponse.json({
      shift: updatedShift,
      message: 'Clocked out successfully',
    })
  })(request)
}

