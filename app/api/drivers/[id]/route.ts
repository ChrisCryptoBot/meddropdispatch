import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, NotFoundError } from '@/lib/errors'
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
  // Status (admin only)
  status: z.enum(['PENDING_APPROVAL', 'AVAILABLE', 'ON_ROUTE', 'OFF_DUTY', 'INACTIVE']).optional(),
  // Vehicle fields
  vehicleType: z.string().optional().nullable(),
  vehicleMake: z.string().optional().nullable(),
  vehicleModel: z.string().optional().nullable(),
  vehicleYear: z.number().int().min(1900).max(2100).optional().nullable(),
  vehiclePlate: z.string().optional().nullable(),
  hasRefrigeration: z.boolean().optional(),
  // Personalization fields
  profilePicture: z.string().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  specialties: z.string().optional().nullable(),
  yearsOfExperience: z.number().int().min(0).max(50).optional().nullable(),
  languages: z.string().optional().nullable(),
  serviceAreas: z.string().optional().nullable(),
})

/**
 * GET /api/drivers/[id]
 * Get driver profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    rateLimit(RATE_LIMITS.api)(request)
  } catch (error) {
    return createErrorResponse(error)
  }

  try {
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
        profilePicture: true,
        bio: true,
        specialties: true,
        yearsOfExperience: true,
        languages: true,
        serviceAreas: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    return NextResponse.json({ driver })
  } catch (error) {
    console.error('Error in GET /api/drivers/[id]:', error)
    return createErrorResponse(error)
  }
}

/**
 * PATCH /api/drivers/[id]
 * Update driver profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    rateLimit(RATE_LIMITS.api)(request)
  } catch (error) {
    return createErrorResponse(error)
  }

  try {
    const { id } = await params
    const rawData = await request.json()

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
    if (data.status !== undefined) updateData.status = data.status
    if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType
    if (data.vehicleMake !== undefined) updateData.vehicleMake = data.vehicleMake
    if (data.vehicleModel !== undefined) updateData.vehicleModel = data.vehicleModel
    if (data.vehicleYear !== undefined) updateData.vehicleYear = data.vehicleYear
    if (data.vehiclePlate !== undefined) updateData.vehiclePlate = data.vehiclePlate
    if (data.hasRefrigeration !== undefined) updateData.hasRefrigeration = data.hasRefrigeration
    if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture
    if (data.bio !== undefined) updateData.bio = data.bio
    if (data.specialties !== undefined) updateData.specialties = data.specialties
    if (data.yearsOfExperience !== undefined) updateData.yearsOfExperience = data.yearsOfExperience
    if (data.languages !== undefined) updateData.languages = data.languages
    if (data.serviceAreas !== undefined) updateData.serviceAreas = data.serviceAreas

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
        profilePicture: true,
        bio: true,
        specialties: true,
        yearsOfExperience: true,
        languages: true,
        serviceAreas: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      driver: updatedDriver,
    })
  } catch (error) {
    console.error('Error in PATCH /api/drivers/[id]:', error)
    return createErrorResponse(error)
  }
}

/**
 * DELETE /api/drivers/[id]
 * Delete driver account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    rateLimit(RATE_LIMITS.api)(request)
  } catch (error) {
    return createErrorResponse(error)
  }

  try {
    const { id } = await params

    // Get request body for deletion reason and password
    const body = await request.json().catch(() => ({}))
    const deletionReason = body.reason || body.deletionReason || 'Account deletion requested'
    const { password, driverId } = body

    // Require password verification for deletion
    if (!password || !driverId) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Password and driver ID are required to deactivate an account',
        },
        { status: 400 }
      )
    }

    // Verify driver password
    const driverToVerify = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, passwordHash: true },
    })

    if (!driverToVerify) {
      return NextResponse.json(
        {
          error: 'NotFoundError',
          message: 'Driver not found',
        },
        { status: 404 }
      )
    }

    // Verify password using auth utility
    const { verifyPassword } = await import('@/lib/auth')
    const isValidPassword = await verifyPassword(password, driverToVerify.passwordHash)
    
    if (!isValidPassword) {
      return NextResponse.json(
        {
          error: 'AuthenticationError',
          message: 'Invalid password',
        },
        { status: 401 }
      )
    }

    // Ensure the driver ID matches
    if (driverId !== id) {
      return NextResponse.json(
        {
          error: 'AuthorizationError',
          message: 'Driver ID mismatch',
        },
        { status: 403 }
      )
    }

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loadRequests: {
              where: {
                status: {
                  notIn: ['DELIVERED', 'CANCELLED', 'COMPLETED', 'DENIED'],
                },
              },
            },
            vehicles: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Check for active loads - warn but allow soft delete (preserves data)
    if (driver._count.loadRequests > 0) {
      // Log warning but proceed with soft delete
      console.warn(`Soft deleting driver with ${driver._count.loadRequests} active loads:`, id)
    }

    // Check for active vehicles - warn but allow deletion
    if (driver._count.vehicles > 0) {
      console.warn(`Soft deleting driver with ${driver._count.vehicles} active vehicles:`, id)
    }

    // Unassign driver from any active loads (set driverId to null)
    // This is handled by onDelete: SetNull in schema, but we do it explicitly for clarity
    await prisma.loadRequest.updateMany({
      where: { driverId: id },
      data: { driverId: null },
    })

    // Soft delete: Mark as deleted
    // This maintains the record for historical purposes but hides it from active lists
    // Cascade deletes will handle related records according to schema (onDelete: Cascade or SetNull)
    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: body.deletedBy || null, // Can be set if we track who deleted it
        deletedReason: deletionReason,
        status: 'INACTIVE', // Set status to inactive
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Driver deactivated successfully',
      driver: updatedDriver,
      warnings: {
        activeLoads: driver._count.loadRequests,
        activeVehicles: driver._count.vehicles,
      },
    })
  } catch (error) {
    console.error('Error in DELETE /api/drivers/[id]:', error)
    return createErrorResponse(error)
  }
}

