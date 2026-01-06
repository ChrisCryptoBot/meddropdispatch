import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthorizationError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyPassword } from '@/lib/auth'
import { z } from 'zod'

const restoreSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  adminId: z.string().min(1, 'Admin ID is required'),
  newStatus: z.enum(['NEW', 'REQUESTED', 'SCHEDULED', 'IN_PROGRESS']).optional(), // Optional status to restore to
})

/**
 * POST /api/load-requests/[id]/restore
 * Restore a cancelled load request (Admin only)
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

    const { password, adminId, newStatus } = validation.data

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

    // Get load request details
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      select: {
        id: true,
        publicTrackingCode: true,
        status: true,
        cancelledAt: true,
        cancelledBy: true,
        cancellationReason: true,
        driverId: true,
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Check if load is actually cancelled
    if (loadRequest.status !== 'CANCELLED') {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: `Load is not cancelled (current status: ${loadRequest.status}) and cannot be restored`,
        },
        { status: 400 }
      )
    }

    // Determine the status to restore to
    // Default to NEW if no driver assigned, or REQUESTED if driver was assigned
    const restoreStatus = newStatus || (loadRequest.driverId ? 'REQUESTED' : 'NEW')

    // Restore the load request
    const restoredLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        status: restoreStatus,
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
      },
      select: {
        id: true,
        publicTrackingCode: true,
        status: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Load request restored successfully to ${restoreStatus} status`,
      loadRequest: restoredLoad,
    })
  })(request)
}

