import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { createErrorResponse, withErrorHandling, AuthenticationError } from '@/lib/errors'
import { loginSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { setAuthCookie } from '@/lib/auth-session'
import { checkAccountLockout, recordLoginAttempt } from '@/lib/account-lockout'

/**
 * POST /api/auth/driver/login
 * Authenticate a driver
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request) => {
    try {
      console.log('[Driver Login] Starting login handler...')
      const nextReq = req as NextRequest
      
      // Apply stricter rate limiting for auth routes
      try {
        console.log('[Driver Login] Applying rate limit...')
        rateLimit(RATE_LIMITS.auth)(nextReq)
        console.log('[Driver Login] Rate limit passed')
      } catch (error) {
        console.error('[Driver Login] Rate limit error:', error)
        return createErrorResponse(error)
      }

      console.log('[Driver Login] Parsing request body...')
      const rawData = await nextReq.json()
      console.log('[Driver Login] Request received for:', rawData?.email)
    
      // Validate request body
      console.log('[Driver Login] Validating request...')
      const validation = await validateRequest(loginSchema, rawData)
      if (!validation.success) {
        console.log('[Driver Login] Validation failed')
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
      console.log('[Driver Login] Validation passed, email:', email)

      // Get IP address for lockout tracking
      const ipAddress = nextReq.headers.get('x-forwarded-for')?.split(',')[0] || 
                       nextReq.headers.get('x-real-ip') || 
                       'unknown'
      console.log('[Driver Login] IP address:', ipAddress)

      // Check if account is locked
      console.log('[Driver Login] Checking account lockout...')
      const lockoutStatus = await checkAccountLockout(email, 'driver', ipAddress)
      console.log('[Driver Login] Lockout status:', lockoutStatus)
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

      // Find driver by email
      console.log('[Driver Login] Looking up driver:', email.toLowerCase())
      const driver = await prisma.driver.findUnique({
        where: { email: email.toLowerCase() }
      })
      console.log('[Driver Login] Driver found:', driver ? 'Yes' : 'No')

      if (!driver) {
        // Record failed attempt
        await recordLoginAttempt(email, 'driver', false, ipAddress)
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Verify password
      console.log('[Driver Login] Verifying password...')
      const isValidPassword = await verifyPassword(password, driver.passwordHash)
      console.log('[Driver Login] Password valid:', isValidPassword)

      if (!isValidPassword) {
        // Record failed attempt
        await recordLoginAttempt(email, 'driver', false, ipAddress)
        
        // Check if this failure should trigger a lockout
        const newLockoutStatus = await checkAccountLockout(email, 'driver', ipAddress)
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

        return NextResponse.json(
          {
            error: 'Invalid email or password',
            remainingAttempts: newLockoutStatus.remainingAttempts,
          },
          { status: 401 }
        )
      }

      // Record successful login attempt (clears failed attempts)
      console.log('[Driver Login] Recording successful login attempt...')
      await recordLoginAttempt(email, 'driver', true, ipAddress)

      // Remove password hash from response
      const { passwordHash, ...driverWithoutPassword } = driver

      // Create response with httpOnly cookie
      // Include isAdmin field in response
      console.log('[Driver Login] Creating response...')
      const response = NextResponse.json({
        success: true,
        driver: {
          ...driverWithoutPassword,
          isAdmin: (driver as any).isAdmin || false,
        },
      })

      // Set authentication cookie
      try {
        await setAuthCookie(response, {
          userId: driver.id,
          userType: 'driver',
          email: driver.email,
        })
      } catch (cookieError) {
        console.error('[Driver Login] Error setting auth cookie:', cookieError)
        // Still return success response even if cookie setting fails
        // (client can still use the driver data in response)
      }

      console.log('[Driver Login] Login successful for:', email)
      return response
    } catch (error) {
      console.error('[Driver Login] CRITICAL ERROR in login handler:')
      console.error('[Driver Login] Error type:', error?.constructor?.name || typeof error)
      console.error('[Driver Login] Error message:', error instanceof Error ? error.message : String(error))
      console.error('[Driver Login] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      console.error('[Driver Login] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
      throw error // Re-throw to be caught by withErrorHandling
    }
  })(request)
}
