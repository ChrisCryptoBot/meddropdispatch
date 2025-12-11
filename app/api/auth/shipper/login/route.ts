import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { createErrorResponse, withErrorHandling, AuthenticationError } from '@/lib/errors'
import { loginSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/auth/shipper/login
 * Authenticate a shipper with email and password
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply stricter rate limiting for auth routes
    try {
      rateLimit(RATE_LIMITS.auth)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const rawData = await req.json()
    
    // Validate request body
    const validation = await validateRequest(loginSchema, rawData)
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

    const { email, password } = validation.data
    
    console.log('Login attempt received:', {
      email,
      hasPassword: !!password,
      passwordLength: password?.length || 0
    })

    // Find shipper by email (case-insensitive)
    const shipper = await prisma.shipper.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!shipper) {
      console.error('Shipper not found for email:', email.toLowerCase())
      throw new AuthenticationError('Invalid email or password')
    }

    // Check if shipper has a password set
    if (!shipper.passwordHash) {
      console.error('Shipper found but no password hash set for email:', email.toLowerCase())
      return NextResponse.json(
        { error: 'Account not set up for login. Please contact support.' },
        { status: 401 }
      )
    }

    // Verify password
    console.log('Attempting password verification...', {
      passwordHashLength: shipper.passwordHash.length,
      passwordHashPrefix: shipper.passwordHash.substring(0, 10)
    })
    
    try {
      const passwordValid = await verifyPassword(password, shipper.passwordHash)
      console.log('Password verification result:', passwordValid)

      if (!passwordValid) {
        console.error('Password verification failed for email:', email.toLowerCase())
        throw new AuthenticationError('Invalid email or password')
      }
    } catch (verifyError) {
      console.error('Password verification threw an error:', verifyError)
      return NextResponse.json(
        { error: 'Login failed', message: verifyError instanceof Error ? verifyError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    console.log('Shipper login successful for email:', email.toLowerCase())

    // Return shipper data (excluding password hash)
    const { passwordHash, ...shipperData } = shipper

    return NextResponse.json({
      success: true,
      shipper: shipperData
    })
  })(request)
}
