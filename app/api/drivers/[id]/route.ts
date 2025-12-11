import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const updateDriverSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  licenseNumber: z.string().optional().nullable(),
  licenseExpiry: z.string().datetime().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  // Vehicle fields
  vehicleType: z.string().optional().nullable(),
  vehicleMake: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  vehicleYear: z.number().int().min(1900).max(2100).optional().nullable(),
  vehiclePlate: z.string().optional().nullable(),
  hasRefrigeration: z.boolean().optional(),
})

/**
 * GET /api/drivers/[id]
 * Get driver profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        licenseNumber: true,
        licenseExpiry: true,
        emergencyContact: true,
        emergencyPhone: true,
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehiclePlate: true,
        hasRefrigeration: true,
        un3373Certified: true,
        hipaaTrainingDate: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    return NextResponse.json({ driver })
  })(request)
}

/**
 * PATCH /api/drivers/[id]
 * Update driver profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await req.json()

    // Validate request
    const validation = updateDriverSchema.safeParse(rawData)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid driver data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Build update data
    const updateData: any = {}
    if (data.firstName !== undefined) updateData.firstName = data.firstName
    if (data.lastName !== undefined) updateData.lastName = data.lastName
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber
    if (data.licenseExpiry !== undefined) {
      updateData.licenseExpiry = data.licenseExpiry ? new Date(data.licenseExpiry) : null
    }
    if (data.emergencyContact !== undefined) updateData.emergencyContact = data.emergencyContact
    if (data.emergencyPhone !== undefined) updateData.emergencyPhone = data.emergencyPhone
    if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType
    if (data.vehicleMake !== undefined) updateData.vehicleMake = data.vehicleMake
    if (data.vehicleModel !== undefined) updateData.vehicleModel = data.vehicleModel
    if (data.vehicleYear !== undefined) updateData.vehicleYear = data.vehicleYear
    if (data.vehiclePlate !== undefined) updateData.vehiclePlate = data.vehiclePlate
    if (data.hasRefrigeration !== undefined) updateData.hasRefrigeration = data.hasRefrigeration

    // Update driver
    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        licenseNumber: true,
        licenseExpiry: true,
        emergencyContact: true,
        emergencyPhone: true,
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehiclePlate: true,
        hasRefrigeration: true,
        un3373Certified: true,
        hipaaTrainingDate: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      driver: updatedDriver,
    })
  })(request)
}
