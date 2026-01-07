import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateInviteCode } from '@/lib/fleet'

/**
 * GET /api/fleets/invites/[code]
 * Validate an invite code (for signup flow)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { code } = await params

    try {
      const invite = await validateInviteCode(code)
      
      return NextResponse.json({
        valid: true,
        fleet: {
          id: invite.fleet.id,
          name: invite.fleet.name,
        },
        role: invite.role,
      })
    } catch (error) {
      return NextResponse.json(
        {
          valid: false,
          error: error instanceof Error ? error.message : 'Invalid invite code',
        },
        { status: 400 }
      )
    }
  })(request)
}

/**
 * POST /api/fleets/invites/[code]/redeem
 * Redeem an invite code (link driver to fleet during signup)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { code } = await params
    const body = await req.json()
    const { driverId } = body

    if (!driverId) {
      throw new ValidationError('Driver ID is required')
    }

    // Validate invite
    const invite = await validateInviteCode(code)

    // Check if driver already has a fleet
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    })

    if (!driver) {
      throw new ValidationError('Driver not found')
    }

    if (driver.fleetId !== null || driver.fleetRole !== 'INDEPENDENT') {
      throw new ValidationError('Driver is already part of a fleet')
    }

    // Link driver to fleet
    await prisma.$transaction(async (tx) => {
      await tx.driver.update({
        where: { id: driverId },
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
    })

    return NextResponse.json({ success: true })
  })(request)
}

