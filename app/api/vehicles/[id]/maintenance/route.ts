// Vehicle Maintenance API Endpoints (Fleet Enterprise - Tier 1)
// POST /api/vehicles/[id]/maintenance - Log maintenance service
// GET /api/vehicles/[id]/maintenance - Get maintenance status and history

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors'
import { requireAuth, requireDriver } from '@/lib/authorization'
import { isMaintenanceCompliant } from '@/lib/vehicle-compliance'
import { z } from 'zod'

const createMaintenanceSchema = z.object({
  type: z.enum(['OIL_CHANGE', 'TIRE_ROTATION', 'INSPECTION', 'REPAIR']),
  odometer: z.number().int().min(0),
  cost: z.number().min(0),
  performedAt: z.string().datetime().or(z.date()),
  notes: z.string().optional(),
})

/**
 * POST /api/vehicles/[id]/maintenance
 * Log a maintenance service for a vehicle
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const { id: vehicleId } = await params
    const rawData = await req.json()

    // Validate request body
    const validation = createMaintenanceSchema.safeParse(rawData)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid maintenance data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify vehicle exists and get owner
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        driverId: true,
        vehiclePlate: true,
        currentOdometer: true,
      },
    })

    if (!vehicle) {
      throw new NotFoundError('Vehicle')
    }

    // AUTHORIZATION: Verify user owns the vehicle or is admin
    const auth = await requireAuth(request as NextRequest)
    
    if (auth.userType === 'driver') {
      const driverAuth = await requireDriver(request as NextRequest)
      if (driverAuth.userId !== vehicle.driverId) {
        throw new AuthorizationError('Cannot log maintenance for another driver\'s vehicle')
      }
    }
    // Admins can log maintenance for any vehicle

    // Validate odometer reading is not less than current odometer (typo protection)
    if (data.odometer < vehicle.currentOdometer) {
      throw new ValidationError(
        `Odometer reading (${data.odometer}) cannot be less than current odometer (${vehicle.currentOdometer}). Please verify the reading.`
      )
    }

    // Convert performedAt to Date
    const performedAt = typeof data.performedAt === 'string' ? new Date(data.performedAt) : data.performedAt

    // Create maintenance log
    const maintenance = await prisma.vehicleMaintenance.create({
      data: {
        vehicleId,
        type: data.type,
        odometer: data.odometer,
        cost: data.cost,
        performedAt,
        notes: data.notes || null,
      },
    })

    // Update vehicle's lastServiceDate if this is an OIL_CHANGE (most critical service)
    if (data.type === 'OIL_CHANGE') {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          lastServiceDate: performedAt,
        },
      })
    }

    // Re-check maintenance compliance to get updated status
    const maintenanceStatus = await isMaintenanceCompliant(vehicleId)

    return NextResponse.json({
      success: true,
      maintenance,
      maintenanceStatus,
    }, { status: 201 })
  })(request)
}

/**
 * GET /api/vehicles/[id]/maintenance
 * Get maintenance history and status for a vehicle
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const { id: vehicleId } = await params

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        driverId: true,
        vehiclePlate: true,
        currentOdometer: true,
        lastManualOdometerEntry: true,
        lastManualEntryDate: true,
        lastServiceDate: true,
      },
    })

    if (!vehicle) {
      throw new NotFoundError('Vehicle')
    }

    // AUTHORIZATION: Verify user owns the vehicle or is admin
    const auth = await requireAuth(request as NextRequest)
    
    if (auth.userType === 'driver') {
      const driverAuth = await requireDriver(request as NextRequest)
      if (driverAuth.userId !== vehicle.driverId) {
        throw new AuthorizationError('Cannot view maintenance for another driver\'s vehicle')
      }
    }
    // Admins can view maintenance for any vehicle

    // Get maintenance logs
    const logs = await prisma.vehicleMaintenance.findMany({
      where: { vehicleId },
      orderBy: { performedAt: 'desc' },
      select: {
        id: true,
        type: true,
        odometer: true,
        cost: true,
        performedAt: true,
        notes: true,
      },
    })

    // Get maintenance compliance status
    const maintenanceStatus = await isMaintenanceCompliant(vehicleId)

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        vehiclePlate: vehicle.vehiclePlate,
        currentOdometer: vehicle.currentOdometer,
        lastManualOdometerEntry: vehicle.lastManualOdometerEntry,
        lastManualEntryDate: vehicle.lastManualEntryDate,
        lastServiceDate: vehicle.lastServiceDate,
      },
      logs,
      maintenanceStatus,
    })
  })(request)
}

