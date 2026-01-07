import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, ValidationError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyDriverAccess } from '@/lib/authorization'
import { createFleet, validateDriverFleetState } from '@/lib/fleet'

/**
 * GET /api/fleets
 * Get fleet information for the authenticated driver
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    // Get driver from auth
    const { requireDriver } = await import('@/lib/authorization')
    const auth = await requireDriver(request)
    const driverId = auth.userId

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        ownedFleet: {
          include: {
            drivers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                fleetRole: true,
                status: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                drivers: true,
                invites: true,
              },
            },
          },
        },
        fleet: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                drivers: true,
              },
            },
          },
        },
      },
    })

    if (!driver) {
      throw new AuthorizationError('Driver not found')
    }

    // Return fleet info based on role
    if (driver.fleetRole === 'OWNER' && driver.ownedFleet) {
      return NextResponse.json({
        fleet: driver.ownedFleet,
        role: 'OWNER',
      })
    }

    if (driver.fleet && ['ADMIN', 'DRIVER'].includes(driver.fleetRole || '')) {
      return NextResponse.json({
        fleet: driver.fleet,
        role: driver.fleetRole,
      })
    }

    // Independent driver
    return NextResponse.json({
      fleet: null,
      role: 'INDEPENDENT',
    })
  })(request)
}

/**
 * POST /api/fleets
 * Create a new fleet (upgrade from Independent to Fleet Owner)
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
    })

    if (!driver) {
      throw new AuthorizationError('Driver not found')
    }

    // Validate current state
    if (driver.fleetRole !== 'INDEPENDENT' || driver.fleetId !== null) {
      throw new ValidationError('Driver must be INDEPENDENT to create a fleet')
    }

    const body = await req.json()
    const { name, taxId } = body

    if (!name || name.trim().length === 0) {
      throw new ValidationError('Fleet name is required')
    }

    // Create fleet
    const fleet = await createFleet(driverId, name.trim(), taxId?.trim() || undefined)

    return NextResponse.json({ fleet }, { status: 201 })
  })(request)
}

