import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { sendDriverWelcomeEmail } from '@/lib/email'
import { createErrorResponse, withErrorHandling, ValidationError } from '@/lib/errors'
import { driverSignupSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createFleet, validateInviteCode } from '@/lib/fleet'

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

    // Fleet Protocol fields (optional, not in validation schema yet)
    const signupType = (rawData as any).signupType as 'INDEPENDENT' | 'FLEET_OWNER' | 'JOIN_TEAM' | undefined
    const fleetName = (rawData as any).fleetName as string | undefined
    const fleetTaxId = (rawData as any).fleetTaxId as string | undefined
    const inviteCode = (rawData as any).inviteCode as string | undefined

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

    // Create driver with Fleet Protocol logic
    const driver = await prisma.$transaction(async (tx) => {
      // Create driver (default to INDEPENDENT)
      const newDriver = await tx.driver.create({
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
          fleetRole: 'INDEPENDENT',
          fleetId: null,
        },
      })

      // Handle Fleet Protocol signup types
      if (signupType === 'FLEET_OWNER') {
        if (!fleetName || fleetName.trim().length === 0) {
          throw new ValidationError('Fleet name is required for fleet owner signup')
        }
        
        // Create fleet and link driver
        const fleet = await createFleet(newDriver.id, fleetName.trim(), fleetTaxId?.trim() || undefined)
        
        // Update driver to be owner (createFleet already does this, but ensure it)
        await tx.driver.update({
          where: { id: newDriver.id },
          data: {
            fleetId: fleet.id,
            fleetRole: 'OWNER',
          },
        })
      } else if (signupType === 'JOIN_TEAM') {
        if (!inviteCode || inviteCode.trim().length === 0) {
          throw new ValidationError('Invite code is required to join a team')
        }

        // Validate and redeem invite
        const invite = await validateInviteCode(inviteCode.trim().toUpperCase())
        
        // Link driver to fleet
        await tx.driver.update({
          where: { id: newDriver.id },
          data: {
            fleetId: invite.fleetId,
            fleetRole: invite.role,
          },
        })

        // Increment used count
        await tx.fleetInvite.update({
          where: { id: invite.id },
          data: {
            usedCount: { increment: 1 },
          },
        })
      }

      // Return updated driver
      return await tx.driver.findUnique({
        where: { id: newDriver.id },
      })
    })

    if (!driver) {
      throw new Error('Failed to create driver')
    }

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

