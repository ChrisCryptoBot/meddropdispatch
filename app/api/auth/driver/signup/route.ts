import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { sendDriverWelcomeEmail } from '@/lib/email'

/**
 * POST /api/auth/driver/signup
 * Create a new driver account
 */
export async function POST(request: NextRequest) {
  try {
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
    } = await request.json()

    // Validation
    if (!email || !password || !firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: 'Email, password, first name, last name, and phone are required' },
        { status: 400 }
      )
    }

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
        vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
        vehiclePlate: vehiclePlate || null,
        hasRefrigeration: hasRefrigeration || false,
        status: 'AVAILABLE',
      },
    })

    // Remove password hash from response
    const { passwordHash: _, ...driverWithoutPassword } = driver

    // Send welcome email (don't block on email failure)
    try {
      console.log('📧 [Signup] Attempting to send welcome email to:', driver.email)
      console.log('📧 [Signup] RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)
      console.log('📧 [Signup] RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL)
      
      await sendDriverWelcomeEmail({
        to: driver.email,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
      })
      console.log('✅ Driver welcome email sent successfully to:', driver.email)
    } catch (error) {
      console.error('❌ Failed to send driver welcome email:', error)
      console.error('❌ Error details:', {
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

  } catch (error) {
    console.error('Driver signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

