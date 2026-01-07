import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, ValidationError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyDriverAccess } from '@/lib/authorization'

/**
 * GET /api/fleets/[id]/drivers
 * Get all drivers in a fleet (only for OWNER/ADMIN)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: fleetId } = await params
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

    // Verify driver has access to this fleet
    const driverFleetId = driver.ownedFleet?.id || driver.fleetId
    if (driverFleetId !== fleetId) {
      throw new AuthorizationError('Access denied to this fleet')
    }

    // Only OWNER or ADMIN can view fleet roster
    if (driver.fleetRole !== 'OWNER' && driver.fleetRole !== 'ADMIN') {
      throw new AuthorizationError('Only fleet owners and admins can view fleet roster')
    }

    const drivers = await prisma.driver.findMany({
      where: { fleetId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        fleetRole: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            loadRequests: true,
          },
        },
      },
      orderBy: [
        { fleetRole: 'asc' }, // OWNER first, then ADMIN, then DRIVER
        { lastName: 'asc' },
      ],
    })

    return NextResponse.json({ drivers })
  })(request)
}

/**
 * PATCH /api/fleets/[id]/drivers/[driverId]
 * Update driver role in fleet (promote/demote)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; driverId: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: fleetId, driverId: targetDriverId } = await params
    const driverId = request.headers.get('x-driver-id')

    if (!driverId) {
      throw new AuthorizationError('Driver authentication required')
    }

    await verifyDriverAccess(request, driverId)

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { ownedFleet: true },
    })

    if (!driver) {
      throw new AuthorizationError('Driver not found')
    }

    // Only OWNER can promote/demote
    if (driver.fleetRole !== 'OWNER') {
      throw new AuthorizationError('Only fleet owners can modify driver roles')
    }

    // Verify fleet ownership
    if (driver.ownedFleet?.id !== fleetId) {
      throw new AuthorizationError('Access denied to this fleet')
    }

    // Cannot modify owner
    if (targetDriverId === driverId) {
      throw new ValidationError('Cannot modify fleet owner role')
    }

    const body = await req.json()
    const { fleetRole, canBeAssignedLoads } = body

    if (fleetRole && !['ADMIN', 'DRIVER'].includes(fleetRole)) {
      throw new ValidationError('Role must be ADMIN or DRIVER')
    }

    const targetDriver = await prisma.driver.findUnique({
      where: { id: targetDriverId, fleetId },
    })

    if (!targetDriver) {
      throw new ValidationError('Driver not found in this fleet')
    }

    const updateData: any = {}
    if (fleetRole) updateData.fleetRole = fleetRole
    if (canBeAssignedLoads !== undefined) updateData.canBeAssignedLoads = canBeAssignedLoads

    const updated = await prisma.driver.update({
      where: { id: targetDriverId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        fleetRole: true,
        canBeAssignedLoads: true,
      },
    })

    return NextResponse.json({ driver: updated })
  })(request)
}

/**
 * DELETE /api/fleets/[id]/drivers/[driverId]
 * Remove driver from fleet (revert to INDEPENDENT)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; driverId: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: fleetId, driverId: targetDriverId } = await params
    const driverId = request.headers.get('x-driver-id')

    if (!driverId) {
      throw new AuthorizationError('Driver authentication required')
    }

    await verifyDriverAccess(request, driverId)

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { ownedFleet: true },
    })

    if (!driver) {
      throw new AuthorizationError('Driver not found')
    }

    // Only OWNER can remove drivers
    if (driver.fleetRole !== 'OWNER') {
      throw new AuthorizationError('Only fleet owners can remove drivers')
    }

    // Verify fleet ownership
    if (driver.ownedFleet?.id !== fleetId) {
      throw new AuthorizationError('Access denied to this fleet')
    }

    // Cannot remove owner
    if (targetDriverId === driverId) {
      throw new ValidationError('Fleet owner cannot remove themselves. Delete the fleet instead.')
    }

    const targetDriver = await prisma.driver.findUnique({
      where: { id: targetDriverId, fleetId },
    })

    if (!targetDriver) {
      throw new ValidationError('Driver not found in this fleet')
    }

    // Revert to INDEPENDENT
    await prisma.driver.update({
      where: { id: targetDriverId },
      data: {
        fleetRole: 'INDEPENDENT',
        fleetId: null,
      },
    })

    return NextResponse.json({ success: true })
  })(request)
}

