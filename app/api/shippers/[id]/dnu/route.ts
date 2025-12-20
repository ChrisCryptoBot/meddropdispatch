import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const dnuSchema = z.object({
  reason: z.string().optional(),
  blockEmail: z.boolean().default(true), // Whether to block the email from future signups
})

/**
 * POST /api/shippers/[id]/dnu
 * Mark shipper as DNU (Do Not Use) - Hard delete and block email
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

    const { reason, blockEmail } = validation.data

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
          },
        })
      }
    }

    // Hard delete the shipper account
    // This will cascade delete facilities, templates, etc.
    await prisma.shipper.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Shipper marked as DNU and deleted. Email has been blocked from future signups.',
      emailBlocked: blockEmail,
    })
  })(request)
}


