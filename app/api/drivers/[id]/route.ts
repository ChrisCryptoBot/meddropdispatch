import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { updateDriverSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers/[id]
 * Get driver details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
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
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehiclePlate: true,
        hasRefrigeration: true,
        un3373Certified: true,
        un3373ExpiryDate: true,
        hipaaTrainingDate: true,
        hiredDate: true,
        emergencyContact: true,
        emergencyPhone: true,
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
 * Update driver details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawBody = await req.json()
    
    // Validate request body
    const validation = await validateRequest(updateDriverSchema, rawBody)
    if (!validation.success) {
      const formatted = formatZodErrors(validation.errors)
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: formatted.message,
          errors: formatted.errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const body = validation.data

    const {
      firstName,
      lastName,
      email,
      phone,
      licenseNumber,
      licenseExpiry,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehiclePlate,
      hasRefrigeration,
      emergencyContact,
      emergencyPhone,
    } = body

    const updateData: any = {}

    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (email !== undefined) updateData.email = email.toLowerCase()
    if (phone !== undefined) updateData.phone = phone
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber || null
    if (licenseExpiry !== undefined) updateData.licenseExpiry = licenseExpiry ? new Date(licenseExpiry) : null
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType || null
    if (vehicleMake !== undefined) updateData.vehicleMake = vehicleMake || null
    if (vehicleModel !== undefined) updateData.vehicleModel = vehicleModel || null
    if (vehicleYear !== undefined) updateData.vehicleYear = vehicleYear || null
    if (vehiclePlate !== undefined) updateData.vehiclePlate = vehiclePlate || null
    if (hasRefrigeration !== undefined) updateData.hasRefrigeration = hasRefrigeration
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact || null
    if (emergencyPhone !== undefined) updateData.emergencyPhone = emergencyPhone || null

    const driver = await prisma.driver.update({
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
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehiclePlate: true,
        hasRefrigeration: true,
        un3373Certified: true,
        un3373ExpiryDate: true,
        hipaaTrainingDate: true,
        hiredDate: true,
        emergencyContact: true,
        emergencyPhone: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ driver })
  })(request)
}

