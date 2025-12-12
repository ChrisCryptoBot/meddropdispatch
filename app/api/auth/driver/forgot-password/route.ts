import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { hashPassword } from '@/lib/auth'
import { sendForgotPasswordEmail } from '@/lib/email'
import { z } from 'zod'
import crypto from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

/**
 * POST /api/auth/driver/forgot-password
 * Send username and temporary password to driver's email
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting for security
    try {
      rateLimit(RATE_LIMITS.auth)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const rawData = await req.json()
    
    // Validate request body
    const validation = forgotPasswordSchema.safeParse(rawData)
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
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    // Always return success message (don't reveal if email exists)
    // This prevents email enumeration attacks
    if (!driver) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a password reset email has been sent.',
      })
    }

    // Generate a temporary password (12 characters, alphanumeric + special chars)
    const tempPassword = crypto.randomBytes(8).toString('base64').slice(0, 12) + '!@#'

    // Hash the temporary password
    const tempPasswordHash = await hashPassword(tempPassword)

    // Update driver's password
    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        passwordHash: tempPasswordHash,
      },
    })

    // Send email with username and temporary password
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    await sendForgotPasswordEmail({
      to: driver.email,
      firstName: driver.firstName || 'Driver',
      lastName: driver.lastName || '',
      username: driver.email,
      temporaryPassword: tempPassword,
      loginUrl: `${baseUrl}/driver/login`,
    })

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a password reset email has been sent.',
    })
  })(request)
}

