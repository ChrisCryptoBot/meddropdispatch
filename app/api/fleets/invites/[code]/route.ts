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

    // TIER 2.8: Atomic invite redemption (prevents Zombie Invite race condition)
    // Use updateMany with WHERE clause to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Check expiry (Tier 3.14: Invite Expiry Staleness)
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        throw new ValidationError('Invite code has expired')
      }

      // Atomic update: Only increment if usedCount < maxUses (or maxUses is null)
      const inviteUpdate = await tx.fleetInvite.updateMany({
        where: {
          id: invite.id,
          OR: [
            { maxUses: null }, // No limit
            { usedCount: { lt: invite.maxUses! } }, // Under limit
          ],
        },
        data: {
          usedCount: { increment: 1 },
        },
      })

      if (inviteUpdate.count === 0) {
        throw new ValidationError('Invite code has reached maximum uses or is invalid')
      }

      // Link driver to fleet (only if driver is still INDEPENDENT)
      const driverUpdate = await tx.driver.updateMany({
        where: {
          id: driverId,
          fleetId: null,
          fleetRole: 'INDEPENDENT',
        },
        data: {
          fleetId: invite.fleetId,
          fleetRole: invite.role,
        },
      })

      if (driverUpdate.count === 0) {
        // Rollback invite increment (manual rollback needed)
        await tx.fleetInvite.update({
          where: { id: invite.id },
          data: {
            usedCount: { decrement: 1 },
          },
        })
        throw new ValidationError('Driver is already part of a fleet or state changed')
      }

      return { success: true }
    })

    return NextResponse.json({ success: true })
  })(request)
}

