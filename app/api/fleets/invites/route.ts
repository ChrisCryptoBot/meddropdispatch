import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, ValidationError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyDriverAccess } from '@/lib/authorization'
import { generateInviteCode } from '@/lib/fleet'

/**
 * GET /api/fleets/invites
 * List all invites for the authenticated driver's fleet
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { requireDriver } = await import('@/lib/authorization')
    const auth = await requireDriver(request)
    const driverId = auth.userId

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { ownedFleet: true, fleet: true },
    })

    if (!driver) {
      throw new AuthorizationError('Driver not found')
    }

    // Only OWNER or ADMIN can view invites
    if (driver.fleetRole !== 'OWNER' && driver.fleetRole !== 'ADMIN') {
      throw new AuthorizationError('Only fleet owners and admins can view invites')
    }

    const fleetId = driver.ownedFleet?.id || driver.fleetId
    if (!fleetId) {
      throw new ValidationError('Driver is not part of a fleet')
    }

    const invites = await prisma.fleetInvite.findMany({
      where: { fleetId },
      orderBy: { id: 'desc' }, // Order by ID (newest first)
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ invites })
  })(request)
}

/**
 * POST /api/fleets/invites
 * Create a new fleet invite
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { requireDriver } = await import('@/lib/authorization')
    const auth = await requireDriver(request)
    const driverId = auth.userId

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { ownedFleet: true, fleet: true },
    })

    if (!driver) {
      throw new AuthorizationError('Driver not found')
    }

    // Only OWNER or ADMIN can create invites
    if (driver.fleetRole !== 'OWNER' && driver.fleetRole !== 'ADMIN') {
      throw new AuthorizationError('Only fleet owners and admins can create invites')
    }

    const fleetId = driver.ownedFleet?.id || driver.fleetId
    if (!fleetId) {
      throw new ValidationError('Driver is not part of a fleet')
    }

    const body = await req.json()
    const { role = 'DRIVER', expiresInDays, maxUses = 1 } = body

    if (!['DRIVER', 'ADMIN'].includes(role)) {
      throw new ValidationError('Role must be DRIVER or ADMIN')
    }

    // Generate unique code
    let code = generateInviteCode()
    let attempts = 0
    while (await prisma.fleetInvite.findUnique({ where: { code } })) {
      code = generateInviteCode()
      attempts++
      if (attempts > 10) {
        throw new Error('Failed to generate unique invite code')
      }
    }

    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const invite = await prisma.fleetInvite.create({
      data: {
        fleetId,
        code,
        role,
        expiresAt,
        maxUses: maxUses > 0 ? maxUses : null,
        createdById: driverId,
      },
    })

    return NextResponse.json({ invite }, { status: 201 })
  })(request)
}

