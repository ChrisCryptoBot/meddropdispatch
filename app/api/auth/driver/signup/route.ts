import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { sendDriverWelcomeEmail } from '@/lib/email'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { driverSignupSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/auth/driver/signup
 * Create a new driver account
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const nextReq = req as NextRequest
    // Apply rate limiting (stricter for signup)
    try {
      rateLimit(RATE_LIMITS.auth)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const rawData = await req.json()

    // Validate request body
    const validation = await validateRequest(driverSignupSchema, rawData)
    if (!validation.success) {
      const formatted = formatZodErrors(validation.errors)
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: formatted.message,
          errors: formatted.errors,
        },
        { status: 400 }
      )
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      licenseNumber,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehiclePlate,
      hasRefrigeration,
    } = validation.data

    // Check if driver already exists
    const existing = await prisma.driver.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create driver
    const driver = await prisma.driver.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone,
        licenseNumber: licenseNumber || null,
        vehicleType: vehicleType || null,
        vehicleMake: vehicleMake || null,
        vehicleModel: vehicleModel || null,
        vehicleYear: vehicleYear ? (typeof vehicleYear === 'string' ? parseInt(vehicleYear) : vehicleYear) : null,
        vehiclePlate: vehiclePlate || null,
        hasRefrigeration: hasRefrigeration || false,
        status: 'PENDING_APPROVAL',
      },
    })

    // Remove password hash from response
    const { passwordHash: _, ...driverWithoutPassword } = driver

    // Send welcome email (don't block on email failure)
    try {
      console.log('[Signup] Attempting to send welcome email to:', driver.email)
      console.log('[Signup] RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)
      console.log('[Signup] RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL)
      
      await sendDriverWelcomeEmail({
        to: driver.email,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
      })
      console.log('SUCCESS: Driver welcome email sent successfully to:', driver.email)
    } catch (error) {
      console.error('ERROR: Failed to send driver welcome email:', error)
      console.error('ERROR: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
      })
      // Don't fail signup if email fails
    }

    return NextResponse.json({
      success: true,
      driver: driverWithoutPassword,
      message: 'Driver account created successfully',
    }, { status: 201 })
  })(request)
}

