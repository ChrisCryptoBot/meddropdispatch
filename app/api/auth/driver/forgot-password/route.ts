import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPasswordResetToken } from '@/lib/password-reset'
import { sendPasswordResetEmail } from '@/lib/email'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

/**
 * POST /api/auth/driver/forgot-password
 * Request password reset for a driver
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    const body = await nextReq.json()
    
    // Validate request
    const validation = forgotPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid email address',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { email } = validation.data

    // Find driver by email
    const driver = await prisma.driver.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, firstName: true, lastName: true },
    })

    // Always return success (don't reveal if email exists)
    // This prevents email enumeration attacks
    if (!driver) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Generate reset token
    const token = await createPasswordResetToken(driver.id, 'driver')

    // Get base URL from request
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   nextReq.headers.get('origin') || 
                   'http://localhost:3000'

    // Send password reset email
    await sendPasswordResetEmail({
      to: driver.email,
      name: `${driver.firstName} ${driver.lastName}`,
      resetLink: `${baseUrl}/driver/reset-password?token=${token}`,
      baseUrl,
    })

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  })(request)
}
