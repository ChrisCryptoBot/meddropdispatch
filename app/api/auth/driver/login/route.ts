import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { createErrorResponse, withErrorHandling, AuthenticationError } from '@/lib/errors'
import { loginSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/auth/driver/login
 * Authenticate a driver
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

    // Find driver by email
    const driver = await prisma.driver.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, driver.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Remove password hash from response
    const { passwordHash, ...driverWithoutPassword } = driver

    return NextResponse.json({
      success: true,
      driver: driverWithoutPassword,
    })

  } catch (error) {
    console.error('Driver login error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    console.error('Error details:', errorDetails)
    
    return NextResponse.json(
      { 
        error: 'Login failed', 
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
}
