import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/auth'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthenticationError, ValidationError } from '@/lib/errors'
import { changePasswordSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * PATCH /api/drivers/[id]/password
 * Update driver password
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply stricter rate limiting for password changes
    try {
      rateLimit(RATE_LIMITS.auth)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawBody = await req.json()
    
    // Validate request body
    const validation = await validateRequest(changePasswordSchema, rawBody)
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

    const { currentPassword, newPassword } = validation.data

    // Get driver with password hash
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { passwordHash: true },
    })

    if (!driver || !driver.passwordHash) {
      throw new NotFoundError('Driver')
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, driver.passwordHash)

    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect')
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password
    await prisma.driver.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
      },
    })

    return NextResponse.json({ success: true })
  })(request)
}

