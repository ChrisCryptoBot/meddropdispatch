// Driver Shift Clock-In API Endpoint (Fleet Enterprise - Tier 1)
// POST /api/drivers/[id]/shifts/clock-in - Clock in to start shift

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, ValidationError, AuthorizationError } from '@/lib/errors'
import { requireDriver } from '@/lib/authorization'
import { z } from 'zod'

const clockInSchema = z.object({
  odometerReading: z.number().int().min(0).optional(), // Optional - driver can provide odometer at clock-in
})

/**
 * POST /api/drivers/[id]/shifts/clock-in
 * Clock in to start a shift
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const { id: driverId } = await params
    const rawData = await req.json()

    // Validate request body
    const validation = clockInSchema.safeParse(rawData)
    if (!validation.success) {
      throw new ValidationError('Invalid clock-in data', validation.error.errors)
    }

    const { odometerReading } = validation.data

    // AUTHORIZATION: Verify authenticated driver matches driverId
    const auth = await requireDriver(request)
    if (auth.userId !== driverId) {
      throw new AuthorizationError('Cannot clock in as another driver')
    }

    // Check if driver already has an open shift
    const existingShift = await prisma.driverShift.findFirst({
      where: {
        driverId,
        clockOut: null, // Open shifts only
      },
    })

    if (existingShift) {
      throw new ValidationError('You already have an active shift. Please clock out first.')
    }

    const clockInTime = new Date()

    // Check driver status before clocking in
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { status: true },
    })

    if (!driver) {
      throw new ValidationError('Driver not found')
    }

    // Only allow clock-in if driver is approved
    if (driver.status === 'PENDING_APPROVAL') {
      throw new ValidationError('Cannot clock in while driver account is pending approval')
    }

    if (driver.status === 'INACTIVE') {
      throw new ValidationError('Cannot clock in while driver account is inactive')
    }

    // Create new shift
    const newShift = await prisma.driverShift.create({
      data: {
        driverId,
        clockIn: clockInTime,
      },
    })

    // Update driver status to AVAILABLE when clocking in (unless already ON_ROUTE with a load)
    // Only change status if currently OFF_DUTY or AVAILABLE
    if (driver.status === 'OFF_DUTY' || driver.status === 'AVAILABLE') {
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: 'AVAILABLE' },
      })
    }

    // TIER 2.1: Update vehicle odometer with manual input if provided
    if (odometerReading !== undefined) {
      const driverVehicle = await prisma.vehicle.findFirst({
        where: { driverId, isActive: true }, // Assuming driver uses one primary vehicle for shifts
        select: { id: true, currentOdometer: true },
      })

      if (driverVehicle) {
        if (odometerReading < driverVehicle.currentOdometer) {
          throw new ValidationError(`Clock-in odometer (${odometerReading}) cannot be less than current odometer (${driverVehicle.currentOdometer}).`)
        }
        await prisma.vehicle.update({
          where: { id: driverVehicle.id },
          data: {
            currentOdometer: odometerReading,
            lastManualOdometerEntry: odometerReading,
            lastManualEntryDate: clockInTime,
          },
        })
      }
    }

    return NextResponse.json({
      shift: newShift,
      message: 'Clocked in successfully',
    })
  })(request)
}

