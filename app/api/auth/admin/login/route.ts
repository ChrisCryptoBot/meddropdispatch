import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { createErrorResponse, withErrorHandling, AuthenticationError } from '@/lib/errors'
import { loginSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { setAuthCookie } from '@/lib/auth-session'

/**
 * POST /api/auth/admin/login
 * Authenticate an admin user
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      throw new AuthenticationError('Invalid email or password')
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password')
    }

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user

    // Create response with httpOnly cookie
    const response = NextResponse.json({
      user: userWithoutPassword,
    })

    // Set authentication cookie
    await setAuthCookie(response, {
      userId: user.id,
      userType: 'admin',
      email: user.email,
    })

    return response
  })(request)
}

