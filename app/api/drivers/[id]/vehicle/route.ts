import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { updateDriverVehicleSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers/[id]/vehicle
 * Get driver vehicle information
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
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehiclePlate: true,
        hasRefrigeration: true,
      },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    return NextResponse.json({ vehicle: driver })
  })(request)
}

/**
 * PATCH /api/drivers/[id]/vehicle
 * Update driver vehicle information
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
    const validation = await validateRequest(updateDriverVehicleSchema, rawBody)
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

    const updateData: any = {}

    if (body.vehicleType !== undefined) updateData.vehicleType = body.vehicleType || null
    if (body.vehicleMake !== undefined) updateData.vehicleMake = body.vehicleMake || null
    if (body.vehicleModel !== undefined) updateData.vehicleModel = body.vehicleModel || null
    if (body.vehicleYear !== undefined) updateData.vehicleYear = body.vehicleYear || null
    if (body.vehiclePlate !== undefined) updateData.vehiclePlate = body.vehiclePlate || null
    if (body.hasRefrigeration !== undefined) updateData.hasRefrigeration = body.hasRefrigeration

    const driver = await prisma.driver.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehiclePlate: true,
        hasRefrigeration: true,
      },
    })

    return NextResponse.json({ driver })
  })(request)
}

