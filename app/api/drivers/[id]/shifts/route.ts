// Driver Shift Management API Endpoints (Fleet Enterprise - Tier 1)
// POST /api/drivers/[id]/shifts/clock-in - Clock in to start shift
// POST /api/drivers/[id]/shifts/clock-out - Clock out to end shift
// GET /api/drivers/[id]/shifts/current - Get current shift status

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors'
import { requireDriver } from '@/lib/authorization'
import { z } from 'zod'

const clockInSchema = z.object({
  odometerReading: z.number().int().min(0).optional(), // Optional - driver can provide odometer at clock-in
})

const clockOutSchema = z.object({
  odometerReading: z.number().int().min(0).optional(), // Optional - driver can provide odometer at clock-out
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
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid clock-in data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { odometerReading } = validation.data

    // AUTHORIZATION: Verify authenticated driver matches driverId
    const auth = await requireDriver(request)
    if (auth.userId !== driverId) {
      throw new AuthorizationError('Cannot clock in as another driver')
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // EDGE CASE 6.3: Check for open shift (concurrency protection)
    const openShift = await prisma.driverShift.findFirst({
      where: {
        driverId,
        clockOut: null, // No clock-out time = shift is still open
      },
    })

    if (openShift) {
      throw new ValidationError('You already have an open shift. Please clock out before starting a new shift.')
    }

    // Create new shift
    const shift = await prisma.driverShift.create({
      data: {
        driverId,
        clockIn: new Date(),
      },
    })

    // If odometer reading provided at clock-in, update vehicle(s)
    if (odometerReading !== undefined) {
      // Get driver's active vehicles (if multiple, update the first active one or let driver specify)
      const vehicles = await prisma.vehicle.findMany({
        where: {
          driverId,
          isActive: true,
        },
        select: {
          id: true,
          vehiclePlate: true,
          currentOdometer: true,
        },
        orderBy: { updatedAt: 'desc' }, // Most recently used vehicle first
        take: 1,
      })

      if (vehicles.length > 0) {
        const vehicle = vehicles[0]
        
        // Validate odometer reading is not less than current (typo protection)
        if (odometerReading < vehicle.currentOdometer) {
          throw new ValidationError(
            `Odometer reading (${odometerReading}) cannot be less than current odometer (${vehicle.currentOdometer}). Please verify the reading.`
          )
        }

        // Update vehicle odometer (hybrid approach: manual entry overwrites calculated)
        await prisma.vehicle.update({
          where: { id: vehicle.id },
          data: {
            currentOdometer: odometerReading,
            lastManualOdometerEntry: odometerReading,
            lastManualEntryDate: new Date(),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      shift,
      message: odometerReading !== undefined 
        ? 'Shift started and odometer updated'
        : 'Shift started',
    }, { status: 201 })
  })(request)
}

/**
 * PATCH /api/drivers/[id]/shifts/clock-out
 * Clock out to end shift
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
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid clock-out data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { odometerReading } = validation.data

    // AUTHORIZATION: Verify authenticated driver matches driverId
    const auth = await requireDriver(request)
    if (auth.userId !== driverId) {
      throw new AuthorizationError('Cannot clock out as another driver')
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Find open shift
    const openShift = await prisma.driverShift.findFirst({
      where: {
        driverId,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' }, // Get most recent shift
    })

    if (!openShift) {
      throw new ValidationError('No open shift found. Cannot clock out.')
    }

    // EDGE CASE 6.3: Unpaid Liability Block - Prevent clock-out if active loads exist
    const activeLoads = await prisma.loadRequest.findMany({
      where: {
        driverId,
        status: {
          in: ['PICKED_UP', 'IN_TRANSIT'], // Active loads in progress
        },
      },
      select: {
        id: true,
        publicTrackingCode: true,
        status: true,
      },
    })

    if (activeLoads.length > 0) {
      const loadCodes = activeLoads.map(l => l.publicTrackingCode).join(', ')
      throw new ValidationError(
        `Cannot clock out while carrying active shipment(s): ${loadCodes}. Complete or transfer active loads before clocking out.`
      )
    }

    // Calculate total hours
    const clockOutTime = new Date()
    const clockInTime = new Date(openShift.clockIn)
    const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60) // Convert ms to hours

    // Update shift with clock-out time and total hours
    const updatedShift = await prisma.driverShift.update({
      where: { id: openShift.id },
      data: {
        clockOut: clockOutTime,
        totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
      },
    })

    // If odometer reading provided at clock-out, update vehicle(s)
    if (odometerReading !== undefined) {
      // Get driver's active vehicles (same logic as clock-in)
      const vehicles = await prisma.vehicle.findMany({
        where: {
          driverId,
          isActive: true,
        },
        select: {
          id: true,
          vehiclePlate: true,
          currentOdometer: true,
          lastManualOdometerEntry: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      })

      if (vehicles.length > 0) {
        const vehicle = vehicles[0]
        
        // Validate odometer reading is not less than current (typo protection)
        if (odometerReading < vehicle.currentOdometer) {
          throw new ValidationError(
            `Odometer reading (${odometerReading}) cannot be less than current odometer (${vehicle.currentOdometer}). Please verify the reading.`
          )
        }

        // Update vehicle odometer (hybrid approach: manual entry overwrites calculated)
        await prisma.vehicle.update({
          where: { id: vehicle.id },
          data: {
            currentOdometer: odometerReading,
            lastManualOdometerEntry: odometerReading,
            lastManualEntryDate: new Date(),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      shift: updatedShift,
      message: odometerReading !== undefined
        ? 'Shift ended and odometer updated'
        : 'Shift ended',
    })
  })(request)
}

/**
 * GET /api/drivers/[id]/shifts/current
 * Get current shift status (open shift if exists)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const { id: driverId } = await params

    // AUTHORIZATION: Verify authenticated driver matches driverId
    const auth = await requireDriver(request)
    if (auth.userId !== driverId) {
      throw new AuthorizationError('Cannot view shifts for another driver')
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Find open shift
    const openShift = await prisma.driverShift.findFirst({
      where: {
        driverId,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
    })

    if (!openShift) {
      return NextResponse.json({
        hasOpenShift: false,
        currentShift: null,
      })
    }

    // Calculate current hours worked (if shift is open)
    const clockInTime = new Date(openShift.clockIn)
    const now = new Date()
    const currentHours = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)

    return NextResponse.json({
      hasOpenShift: true,
      currentShift: {
        id: openShift.id,
        clockIn: openShift.clockIn,
        clockOut: openShift.clockOut,
        totalHours: openShift.totalHours,
        currentHours: Math.round(currentHours * 100) / 100, // Round to 2 decimal places
      },
    })
  })(request)
}

