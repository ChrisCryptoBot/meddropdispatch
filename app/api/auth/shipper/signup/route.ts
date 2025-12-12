import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { sendShipperWelcomeEmail } from '@/lib/email'

/**
 * POST /api/auth/shipper/signup
 * Create a new shipper account
 */
export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      companyName,
      contactName,
      phone,
      clientType,
    } = await request.json()

    // Validation
    if (!email || !password || !companyName || !contactName || !phone) {
      return NextResponse.json(
        { error: 'Email, password, company name, contact name, and phone are required' },
        { status: 400 }
      )
    }

    // Check if shipper already exists
    const existing = await prisma.shipper.findUnique({
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

    // Create shipper
    const shipper = await prisma.shipper.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        companyName,
        contactName,
        phone,
        clientType: clientType || 'CLINIC',
        isActive: true,
      },
    })

    // Remove password hash from response
    const { passwordHash: _, ...shipperWithoutPassword } = shipper

    // Send welcome email (don't block on email failure)
    try {
      await sendShipperWelcomeEmail({
        to: shipper.email,
        companyName: shipper.companyName,
        contactName: shipper.contactName,
        email: shipper.email,
      })
      console.log('✅ Shipper welcome email sent successfully to:', shipper.email)
    } catch (error) {
      console.error('❌ Failed to send shipper welcome email:', error)
      // Don't fail signup if email fails
    }

    return NextResponse.json({
      success: true,
      shipper: shipperWithoutPassword,
      message: 'Shipper account created successfully',
    }, { status: 201 })

  } catch (error) {
    console.error('Shipper signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create account', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

