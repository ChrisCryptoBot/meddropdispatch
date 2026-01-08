import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const updateVehicleSchema = z.object({
  vehicleType: z.enum(['SEDAN', 'SUV', 'VAN', 'SPRINTER', 'BOX_TRUCK', 'REFRIGERATED']).optional(),
  vehicleMake: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  vehicleYear: z.number().int().min(1900).max(2100).optional().nullable(),
  vehiclePlate: z.string().min(1).optional(),
  vehicleNumber: z.string().optional().nullable(), // Personalized vehicle identifier for odometer tracking
  hasRefrigeration: z.boolean().optional(),
  nickname: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  // Compliance & Liability Shield (V2)
  registrationExpiryDate: z.string().datetime().or(z.date()).optional().nullable(),
  insuranceExpiryDate: z.string().datetime().or(z.date()).optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
  registrationDocumentId: z.string().optional().nullable(),
})

/**
 * GET /api/drivers/[id]/vehicles/[vehicleId]
 * Get a specific vehicle
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vehicleId: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const { id: driverId, vehicleId } = await params

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        driverId,
      },
      include: {
        registrationDocument: {
          select: {
            id: true,
            title: true,
            url: true,
            expiryDate: true,
            createdAt: true,
          },
        },
      },
    })

    if (!vehicle) {
      throw new NotFoundError('Vehicle')
    }

    return NextResponse.json({ vehicle })
  })(request)
}

/**
 * PATCH /api/drivers/[id]/vehicles/[vehicleId]
 * Update a vehicle (including registration info)
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

    const { id: driverId, vehicleId } = await params
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

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        driverId,
      },
    })

    if (!vehicle) {
      throw new NotFoundError('Vehicle')
    }

    const data = validation.data

    // Validate vehicleNumber uniqueness per driver (if being updated)
    if (data.vehicleNumber !== undefined) {
      const trimmedVehicleNumber = data.vehicleNumber ? data.vehicleNumber.trim().toUpperCase() : null
      
      if (trimmedVehicleNumber !== null && trimmedVehicleNumber.length === 0) {
        throw new ValidationError('Vehicle number cannot be empty. Use null to remove the vehicle number.')
      }

      if (trimmedVehicleNumber) {
        // Check for duplicate vehicleNumber for this driver (excluding current vehicle)
        const existingVehicle = await prisma.vehicle.findFirst({
          where: {
            driverId,
            vehicleNumber: trimmedVehicleNumber,
            isActive: true,
            id: { not: vehicleId }, // Exclude the current vehicle being edited
          },
        })

        if (existingVehicle) {
          throw new ValidationError(`Vehicle number "${trimmedVehicleNumber}" is already in use. Please choose a different number.`)
        }

        // Validate format: alphanumeric, dash, underscore only
        if (!/^[A-Z0-9_-]+$/.test(trimmedVehicleNumber)) {
          throw new ValidationError('Vehicle number can only contain letters, numbers, dashes, and underscores')
        }

        // Check if vehicle number is being changed
        if (vehicle.vehicleNumber !== trimmedVehicleNumber) {
          // Check if vehicle has active shifts (warn but allow change)
          const activeShifts = await prisma.driverShift.count({
            where: {
              vehicleId,
              clockOut: null, // Active shifts only
            },
          })

          if (activeShifts > 0) {
            // Note: Changing vehicle number while vehicle is in use
            // The current shift keeps the existing vehicleId reference, but future shifts will use the new number
            // This is acceptable since the shift record stores vehicleId, not vehicleNumber
          }

          // Check if vehicle is assigned to active loads (PICKED_UP, IN_TRANSIT, SCHEDULED)
          const activeLoads = await prisma.loadRequest.count({
            where: {
              vehicleId,
              status: {
                in: ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'], // Active load statuses
              },
            },
          })

          if (activeLoads > 0) {
            // Note: Vehicle number change is allowed even with active loads
            // The load record stores vehicleId, not vehicleNumber, so historical data integrity is maintained
          }

          // Update data with trimmed/normalized value
          data.vehicleNumber = trimmedVehicleNumber
        }
      }
    }

    // Parse dates if provided
    const registrationExpiryDate = data.registrationExpiryDate
      ? (data.registrationExpiryDate instanceof Date 
          ? data.registrationExpiryDate 
          : new Date(data.registrationExpiryDate))
      : data.registrationExpiryDate === null
      ? null
      : undefined

    const insuranceExpiryDate = data.insuranceExpiryDate
      ? (data.insuranceExpiryDate instanceof Date 
          ? data.insuranceExpiryDate 
          : new Date(data.insuranceExpiryDate))
      : data.insuranceExpiryDate === null
      ? null
      : undefined

    // Build update data (only include provided fields)
    const updateData: any = {}
    if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType
    if (data.vehicleMake !== undefined) updateData.vehicleMake = data.vehicleMake || null
    if (data.vehicleModel !== undefined) updateData.vehicleModel = data.vehicleModel || null
    if (data.vehicleYear !== undefined) updateData.vehicleYear = data.vehicleYear || null
    if (data.vehiclePlate !== undefined) updateData.vehiclePlate = data.vehiclePlate
    if (data.vehicleNumber !== undefined) updateData.vehicleNumber = data.vehicleNumber || null
    if (data.hasRefrigeration !== undefined) updateData.hasRefrigeration = data.hasRefrigeration
    if (data.nickname !== undefined) updateData.nickname = data.nickname || null
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.registrationExpiryDate !== undefined) updateData.registrationExpiryDate = registrationExpiryDate
    if (data.insuranceExpiryDate !== undefined) updateData.insuranceExpiryDate = insuranceExpiryDate
    if (data.registrationNumber !== undefined) updateData.registrationNumber = data.registrationNumber || null
    if (data.registrationDocumentId !== undefined) updateData.registrationDocumentId = data.registrationDocumentId || null

    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateData,
      include: {
        registrationDocument: {
          select: {
            id: true,
            title: true,
            url: true,
            expiryDate: true,
          },
        },
      },
    })

    return NextResponse.json({ vehicle: updated })
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
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: driverId, vehicleId } = await params

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        driverId,
      },
    })

    if (!vehicle) {
      throw new NotFoundError('Vehicle')
    }

    // Soft delete by deactivating
    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isActive: false },
    })

    return NextResponse.json({ vehicle: updated })
  })(request)
}
