// Driver Shift Clock-Out API Endpoint (Fleet Enterprise - Tier 1)
// PATCH /api/drivers/[id]/shifts/clock-out - Clock out to end shift

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors'
import { requireDriver } from '@/lib/authorization'
import { z } from 'zod'

const clockOutSchema = z.object({
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

    const { odometerReading } = validation.data

    // AUTHORIZATION: Verify authenticated driver matches driverId
    const auth = await requireDriver(request)
    if (auth.userId !== driverId) {
      throw new AuthorizationError('Cannot clock out as another driver')
    }

    // Find the current open shift
    const currentShift = await prisma.driverShift.findFirst({
      where: { driverId, clockOut: null },
    })

    if (!currentShift) {
      throw new NotFoundError('No active shift found to clock out from')
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

    const updatedShift = await prisma.driverShift.update({
      where: { id: currentShift.id },
      data: {
        clockOut: clockOutTime,
        totalHours: parseFloat(totalHours.toFixed(2)),
      },
    })

    // TIER 2.1: Update vehicle odometer with manual input if provided
    if (odometerReading !== undefined) {
      const driverVehicle = await prisma.vehicle.findFirst({
        where: { driverId, isActive: true }, // Assuming driver uses one primary vehicle for shifts
        select: { id: true, currentOdometer: true },
      })

      if (driverVehicle) {
        if (odometerReading < driverVehicle.currentOdometer) {
          throw new ValidationError(`Clock-out odometer (${odometerReading}) cannot be less than current odometer (${driverVehicle.currentOdometer}).`)
        }
        await prisma.vehicle.update({
          where: { id: driverVehicle.id },
          data: {
            currentOdometer: odometerReading,
            lastManualOdometerEntry: odometerReading,
            lastManualEntryDate: clockOutTime,
          },
        })
      }
    }

    return NextResponse.json({
      shift: updatedShift,
      message: 'Clocked out successfully',
    })
  })(request)
}

