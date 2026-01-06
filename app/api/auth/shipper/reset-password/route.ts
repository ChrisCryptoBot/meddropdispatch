import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateResetToken, markTokenAsUsed } from '@/lib/password-reset'
import { hashPassword } from '@/lib/auth'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * POST /api/auth/shipper/reset-password
 * Reset password using a valid token
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    const body = await nextReq.json()
    
    // Validate request
    const validation = resetPasswordSchema.safeParse(body)
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

    const { token, password } = validation.data

    // Validate token
    const tokenValidation = await validateResetToken(token)
    if (!tokenValidation.valid || !tokenValidation.userId || tokenValidation.userType !== 'shipper') {
      return NextResponse.json(
        {
          error: 'InvalidToken',
          message: 'Invalid or expired password reset token',
        },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await hashPassword(password)

    // Update shipper password
    await prisma.shipper.update({
      where: { id: tokenValidation.userId },
      data: { passwordHash },
    })

    // Mark token as used
    await markTokenAsUsed(token)

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    })
  })(request)
}

