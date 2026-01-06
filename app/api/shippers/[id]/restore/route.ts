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
 * POST /api/shippers/[id]/restore
 * Restore a soft-deleted shipper account (Admin only)
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

    // Get shipper details
    const shipper = await prisma.shipper.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        email: true,
        deletedAt: true,
        deletedBy: true,
        deletedReason: true,
      },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    // Check if shipper is actually deleted
    if (!shipper.deletedAt) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Shipper is not deleted and cannot be restored',
        },
        { status: 400 }
      )
    }

    // Restore the shipper account
    const restoredShipper = await prisma.shipper.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
      },
      select: {
        id: true,
        companyName: true,
        email: true,
        isActive: true,
      },
    })

    // Optionally unblock the email
    const blockedEmail = await prisma.blockedEmail.findUnique({
      where: { email: shipper.email.toLowerCase() },
    })

    if (blockedEmail && blockedEmail.isActive) {
      await prisma.blockedEmail.update({
        where: { id: blockedEmail.id },
        data: {
          isActive: false,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Shipper account restored successfully',
      shipper: restoredShipper,
      emailUnblocked: blockedEmail?.isActive || false,
    })
  })(request)
}

