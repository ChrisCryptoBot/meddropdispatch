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
 * POST /api/auth/shipper/forgot-password
 * Request password reset for a shipper
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

    // Find shipper by email
    const shipper = await prisma.shipper.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, contactName: true, companyName: true },
    })

    // Always return success (don't reveal if email exists)
    // This prevents email enumeration attacks
    if (!shipper) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Generate reset token
    const token = await createPasswordResetToken(shipper.id, 'shipper')

    // Get base URL from request
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   nextReq.headers.get('origin') || 
                   'http://localhost:3000'

    // Send password reset email
    await sendPasswordResetEmail({
      to: shipper.email,
      name: shipper.contactName || shipper.companyName,
      resetLink: `${baseUrl}/shipper/reset-password?token=${token}`,
      baseUrl,
    })

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  })(request)
}

