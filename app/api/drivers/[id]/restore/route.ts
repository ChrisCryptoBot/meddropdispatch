import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyPassword } from '@/lib/auth'
import { z } from 'zod'

const restoreSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  adminId: z.string().min(1, 'Admin ID is required'),
})

/**
 * POST /api/drivers/[id]/restore
 * Restore a soft-deleted driver account (Admin only)
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
    const rawData = await req.json()
    const validation = restoreSchema.safeParse(rawData)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid request data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { password, adminId } = validation.data

    // Verify admin password
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, passwordHash: true, role: true },
    })

    if (!admin || admin.role !== 'ADMIN') {
      throw new AuthorizationError('Admin access required')
    }

    const isValidPassword = await verifyPassword(password, admin.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        {
          error: 'AuthenticationError',
          message: 'Invalid admin password',
        },
        { status: 401 }
      )
    }

    // Get driver details
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        deletedAt: true,
        deletedBy: true,
        deletedReason: true,
        isDeleted: true,
        status: true,
      },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Check if driver is actually deleted
    if (!driver.isDeleted && !driver.deletedAt) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Driver is not deleted and cannot be restored',
        },
        { status: 400 }
      )
    }

    // Restore the driver account
    const restoredDriver = await prisma.driver.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        status: 'AVAILABLE', // Set to available status
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isDeleted: true,
        status: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Driver account restored successfully',
      driver: restoredDriver,
    })
  })(request)
}

