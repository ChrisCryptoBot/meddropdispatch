import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { compare, hash } from 'bcryptjs'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * PATCH /api/drivers/[id]/password
 * Change driver password
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await req.json()

    // Validate request
    const validation = changePasswordSchema.safeParse(rawData)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid password data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = validation.data

    // Get driver
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        passwordHash: true,
      },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Verify current password
    const isValid = await compare(currentPassword, driver.passwordHash)
    if (!isValid) {
      throw new ValidationError('Current password is incorrect')
    }

    // Hash new password
    const newPasswordHash = await hash(newPassword, 10)

    // Update password
    await prisma.driver.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    })
  })(request)
}
