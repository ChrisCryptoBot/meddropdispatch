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
      subscriptionTier,
    } = await request.json()

    // Validation
    if (!email || !password || !companyName || !contactName || !phone) {
      return NextResponse.json(
        { error: 'Email, password, company name, contact name, and phone are required' },
        { status: 400 }
      )
    }

    // Check if email is blocked (DNU list)
    try {
      const blockedEmail = await prisma.blockedEmail.findUnique({
        where: { email: email.toLowerCase() },
      })

      if (blockedEmail && blockedEmail.isActive) {
        return NextResponse.json(
          { 
            error: 'Email address is blocked',
            message: 'This email address has been blocked and cannot be used to create an account. Please contact support if you believe this is an error.',
          },
          { status: 403 }
        )
      }
    } catch (error) {
      // If BlockedEmail model doesn't exist yet (Prisma client not regenerated), skip the check
      console.warn('BlockedEmail check skipped - model may not be available yet:', error)
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

    // Generate unique shipperCode (client ID) for new shipper
    const { generateShipperCode } = await import('@/lib/shipper-code')
    const shipperCode = await generateShipperCode(companyName)

    // Create shipper
    const shipper = await prisma.shipper.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        companyName,
        shipperCode, // Include client ID
        contactName,
        phone,
        clientType: clientType || 'CLINIC',
        subscriptionTier: subscriptionTier || 'STANDARD',
        isActive: true,
      },
    })

    // If BROKERAGE tier selected, trigger internal notification (email to admins)
    if (subscriptionTier === 'BROKERAGE') {
      try {
        // TODO: Send "New Enterprise Lead" email to admins
        // This will be implemented when email service is fully configured
        console.log('🚨 NEW BROKERAGE SIGNUP:', {
          companyName: shipper.companyName,
          contactName: shipper.contactName,
          email: shipper.email,
          phone: shipper.phone,
        })
      } catch (error) {
        console.error('Failed to send brokerage notification:', error)
        // Don't fail signup if notification fails
      }
    }

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
      console.log('SUCCESS: Shipper welcome email sent successfully to:', shipper.email)
    } catch (error) {
      console.error('ERROR: Failed to send shipper welcome email:', error)
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


