import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthenticationError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyPassword } from '@/lib/auth'
import { z } from 'zod'

const dnuSchema = z.object({
  reason: z.string().optional(),
  blockEmail: z.boolean().default(true), // Whether to block the email from future signups
  password: z.string().min(1, 'Password is required'),
  driverId: z.string().optional(), // If called by driver
  adminId: z.string().optional(), // If called by admin
})

/**
 * POST /api/shippers/[id]/dnu
 * Mark shipper as DNU (Do Not Use) - Soft delete and block email
 * Requires password verification from driver or admin
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
    const validation = dnuSchema.safeParse(rawData)

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

    const { reason, blockEmail, password, driverId, adminId } = validation.data

    // Verify password - check if driver or admin
    let actorId: string | null = null
    let actorType: 'DRIVER' | 'ADMIN' = 'DRIVER'
    
    if (adminId) {
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
        throw new AuthenticationError('Invalid admin password')
      }
      
      actorId = admin.id
      actorType = 'ADMIN'
    } else if (driverId) {
      // Verify driver password
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { id: true, passwordHash: true },
      })
      
      if (!driver) {
        throw new NotFoundError('Driver')
      }
      
      const isValidPassword = await verifyPassword(password, driver.passwordHash)
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid password')
      }
      
      actorId = driver.id
      actorType = 'DRIVER'
    } else {
      throw new AuthenticationError('Driver ID or Admin ID required with password')
    }

    // Get shipper details
    const shipper = await prisma.shipper.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loadRequests: {
              where: {
                status: {
                  notIn: ['DELIVERED', 'CANCELLED'],
                },
              },
            },
          },
        },
      },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    // Check for active loads - warn but allow DNU
    if (shipper._count.loadRequests > 0) {
      // Still proceed with DNU, but warn about active loads
    }

    // Block the email if requested
    if (blockEmail) {
      // Check if email is already blocked
      const existingBlock = await prisma.blockedEmail.findUnique({
        where: { email: shipper.email.toLowerCase() },
      })

      if (!existingBlock) {
        await prisma.blockedEmail.create({
          data: {
            email: shipper.email.toLowerCase(),
            reason: reason || `DNU: ${shipper.companyName}`,
            blockedBy: null, // Can be set if we track who blocked it
            isActive: true,
          },
        })
      } else if (!existingBlock.isActive) {
        // Reactivate existing block
        await prisma.blockedEmail.update({
          where: { id: existingBlock.id },
          data: {
            isActive: true,
            reason: reason || existingBlock.reason,
            blockedAt: new Date(),
            blockedBy: actorId,
          },
        })
      } else {
        // Update existing active block
        await prisma.blockedEmail.update({
          where: { id: existingBlock.id },
          data: {
            reason: reason || existingBlock.reason,
            blockedBy: actorId,
          },
        })
      }
    }

    // Soft delete the shipper account (preserves data for admin restoration)
    // This maintains the record for historical purposes but hides it from active lists
    const updatedShipper = await prisma.shipper.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: actorId,
        deletedReason: reason || `DNU: ${shipper.companyName} (by ${actorType})`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Shipper marked as DNU. Email has been blocked from future signups. Admins can restore this account later if needed.',
      emailBlocked: blockEmail,
      shipper: {
        id: updatedShipper.id,
        companyName: updatedShipper.companyName,
        email: updatedShipper.email,
        deletedAt: updatedShipper.deletedAt,
      },
    })
  })(request)
}

