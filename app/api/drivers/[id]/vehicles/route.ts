import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const vehicleSchema = z.object({
  vehicleType: z.enum(['SEDAN', 'SUV', 'VAN', 'SPRINTER', 'BOX_TRUCK', 'REFRIGERATED']),
  vehicleMake: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  vehicleYear: z.number().int().min(1900).max(2100).optional().nullable(),
  vehiclePlate: z.string().min(1),
  vehicleNumber: z.string().optional().nullable(), // Client ID for vehicle
  hasRefrigeration: z.boolean().default(false),
  nickname: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  // Compliance & Liability Shield (V2)
  registrationExpiryDate: z.string().datetime().or(z.date()).optional().nullable(),
  insuranceExpiryDate: z.string().datetime().or(z.date()).optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
  registrationDocumentId: z.string().optional().nullable(),
})

/**
 * GET /api/drivers/[id]/vehicles
 * Get all vehicles for a driver
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const { id } = await params

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { driverId: id },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ vehicles })
  })(request)
}

/**
 * POST /api/drivers/[id]/vehicles
 * Create a new vehicle for a driver
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const body = await req.json()

    // Validate request body
    const validation = vehicleSchema.safeParse(body)
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

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    const data = validation.data

    // Validate vehicleNumber uniqueness per driver
    if (data.vehicleNumber) {
      const trimmedVehicleNumber = data.vehicleNumber.trim().toUpperCase()
      if (trimmedVehicleNumber.length === 0) {
        throw new ValidationError('Vehicle number cannot be empty')
      }

      // Check for duplicate vehicleNumber for this driver
      const existingVehicle = await prisma.vehicle.findFirst({
        where: {
          driverId: id,
          vehicleNumber: trimmedVehicleNumber,
          isActive: true, // Only check active vehicles
        },
      })

      if (existingVehicle) {
        throw new ValidationError(`Vehicle number "${trimmedVehicleNumber}" is already in use. Please choose a different number.`)
      }

      // Validate format: alphanumeric, dash, underscore only
      if (!/^[A-Z0-9_-]+$/.test(trimmedVehicleNumber)) {
        throw new ValidationError('Vehicle number can only contain letters, numbers, dashes, and underscores')
      }

      // Update data with trimmed/normalized value
      data.vehicleNumber = trimmedVehicleNumber
    }
    
    // Parse dates if provided as strings
    const registrationExpiryDate = data.registrationExpiryDate
      ? (data.registrationExpiryDate instanceof Date 
          ? data.registrationExpiryDate 
          : new Date(data.registrationExpiryDate))
      : null
    const insuranceExpiryDate = data.insuranceExpiryDate
      ? (data.insuranceExpiryDate instanceof Date 
          ? data.insuranceExpiryDate 
          : new Date(data.insuranceExpiryDate))
      : null

    const vehicle = await prisma.vehicle.create({
      data: {
        driverId: id,
        vehicleType: data.vehicleType,
        vehicleMake: data.vehicleMake || null,
        vehicleModel: data.vehicleModel || null,
        vehicleYear: data.vehicleYear || null,
        vehiclePlate: data.vehiclePlate,
        vehicleNumber: data.vehicleNumber || null,
        hasRefrigeration: data.hasRefrigeration,
        nickname: data.nickname || null,
        isActive: data.isActive,
        registrationExpiryDate,
        insuranceExpiryDate,
        registrationNumber: data.registrationNumber || null,
        registrationDocumentId: data.registrationDocumentId || null,
      },
    })

    return NextResponse.json({ vehicle }, { status: 201 })
  })(request)
}

