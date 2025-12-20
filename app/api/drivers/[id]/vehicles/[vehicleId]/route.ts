import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const updateVehicleSchema = z.object({
  vehicleType: z.enum(['SEDAN', 'SUV', 'VAN', 'SPRINTER', 'BOX_TRUCK', 'REFRIGERATED']).optional(),
  vehicleMake: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  vehicleYear: z.number().int().min(1900).max(2100).optional().nullable(),
  vehiclePlate: z.string().optional(),
  hasRefrigeration: z.boolean().optional(),
  nickname: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

/**
 * PATCH /api/drivers/[id]/vehicles/[vehicleId]
 * Update a vehicle
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vehicleId: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id, vehicleId } = await params
    const body = await req.json()

    // Validate request body
    const validation = updateVehicleSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid vehicle data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    // Verify vehicle belongs to driver
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        driverId: id,
      },
    })

    if (!vehicle) {
      throw new NotFoundError('Vehicle')
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: validation.data,
    })

    return NextResponse.json({ vehicle: updatedVehicle })
  })(request)
}

/**
 * DELETE /api/drivers/[id]/vehicles/[vehicleId]
 * Delete (deactivate) a vehicle
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vehicleId: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const { id, vehicleId } = await params

    // Verify vehicle belongs to driver
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        driverId: id,
      },
    })

    if (!vehicle) {
      throw new NotFoundError('Vehicle')
    }

    // Check if vehicle is assigned to any active loads
    const activeLoads = await prisma.loadRequest.findFirst({
      where: {
        vehicleId: vehicleId,
        status: {
          notIn: ['DELIVERED', 'COMPLETED', 'CANCELLED'],
        },
      },
    })

    if (activeLoads) {
      return NextResponse.json(
        {
          error: 'CannotDeleteVehicle',
          message: 'Cannot delete vehicle that is assigned to an active load. Please deactivate it instead.',
        },
        { status: 400 }
      )
    }

    // Soft delete by setting isActive to false
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isActive: false },
    })

    return NextResponse.json({ vehicle: updatedVehicle })
  })(request)
}

