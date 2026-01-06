import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { createErrorResponse, withErrorHandling, AuthenticationError } from '@/lib/errors'
import { loginSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { setAuthCookie } from '@/lib/auth-session'
import { checkAccountLockout, recordLoginAttempt } from '@/lib/account-lockout'

/**
 * POST /api/auth/shipper/login
 * Authenticate a shipper with email and password
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    // Apply stricter rate limiting for auth routes
    try {
      rateLimit(RATE_LIMITS.auth)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const rawData = await nextReq.json()
    
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
    
    // Get IP address for lockout tracking
    const ipAddress = nextReq.headers.get('x-forwarded-for')?.split(',')[0] || 
                     nextReq.headers.get('x-real-ip') || 
                     'unknown'
    
    console.log('Login attempt received:', {
      email,
      hasPassword: !!password,
      passwordLength: password?.length || 0
    })

    // Check if account is locked
    const lockoutStatus = await checkAccountLockout(email, 'shipper', ipAddress)
    if (lockoutStatus.locked) {
      const minutesRemaining = Math.ceil(
        (lockoutStatus.lockedUntil!.getTime() - Date.now()) / (60 * 1000)
      )
      return NextResponse.json(
        {
          error: 'AccountLocked',
          message: `Account is temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
          lockedUntil: lockoutStatus.lockedUntil,
        },
        { status: 423 } // 423 Locked
      )
    }

    // Find shipper by email (case-insensitive)
    const shipper = await prisma.shipper.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!shipper) {
      console.error('Shipper not found for email:', email.toLowerCase())
      // Record failed attempt
      await recordLoginAttempt(email, 'shipper', false, ipAddress)
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
        // Record failed attempt
        await recordLoginAttempt(email, 'shipper', false, ipAddress)
        
        // Check if this failure should trigger a lockout
        const newLockoutStatus = await checkAccountLockout(email, 'shipper', ipAddress)
        if (newLockoutStatus.locked) {
          const minutesRemaining = Math.ceil(
            (newLockoutStatus.lockedUntil!.getTime() - Date.now()) / (60 * 1000)
          )
          return NextResponse.json(
            {
              error: 'AccountLocked',
              message: `Too many failed login attempts. Account is now locked for ${minutesRemaining} minute(s).`,
              lockedUntil: newLockoutStatus.lockedUntil,
            },
            { status: 423 }
          )
        }
        
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

    // Record successful login attempt (clears failed attempts)
    await recordLoginAttempt(email, 'shipper', true, ipAddress)

    // Return shipper data (excluding password hash)
    const { passwordHash, ...shipperData } = shipper

    // Create response with httpOnly cookie
    const response = NextResponse.json({
      success: true,
      shipper: shipperData
    })

    // Set authentication cookie
    await setAuthCookie(response, {
      userId: shipper.id,
      userType: 'shipper',
      email: shipper.email,
    })

    return response
  })(request)
}
