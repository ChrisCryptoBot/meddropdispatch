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
        canBeAssignedLoads: true, // TIER 2.11: Include for suspend/unsuspend UI
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
 * Update driver role in fleet (promote/demote) or operational status
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

    // TIER 2.11: Expanded Admin Permissions (Operational Super-Admin)
    // Both OWNER and ADMIN can now access this endpoint, but with different scopes
    if (driver.fleetRole !== 'OWNER' && driver.fleetRole !== 'ADMIN') {
      throw new AuthorizationError('Only fleet owners and admins can modify driver roles')
    }

    // Verify fleet ownership/membership
    const driverFleetId = driver.ownedFleet?.id || driver.fleetId
    if (driverFleetId !== fleetId) {
      throw new AuthorizationError('Access denied to this fleet')
    }

    // Cannot modify self (prevents accidental demotion/lockout)
    if (targetDriverId === driverId) {
      throw new ValidationError('Cannot modify your own role')
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

    // TIER 1.3: Hardcode OWNER protection - prevent mutiny
    // No one can modify the OWNER
    if (targetDriver.fleetRole === 'OWNER') {
      throw new ValidationError('Cannot modify fleet owner. Transfer ownership first or delete the fleet.')
    }

    // ADMIN PERMISSION SCOPE CHECKS
    if (driver.fleetRole === 'ADMIN') {
      // 1. Admins cannot promote/demote (Role Management is Owner-Only)
      if (fleetRole !== undefined) {
        throw new AuthorizationError('Only Fleet Owners can change driver roles (promote/demote).')
      }

      // 2. Admins cannot modify other Admins (Mutiny Protection)
      if (targetDriver.fleetRole !== 'DRIVER') {
        throw new AuthorizationError('Admins can only manage standard Drivers, not other Admins.')
      }

      // 3. Admins CAN toggle canBeAssignedLoads (Grounding/Suspension)
      // (This falls through to the update logic below)
    }

    const updateData: any = {}

    // Only apply fleetRole update if user is OWNER (checked above for ADMIN)
    if (driver.fleetRole === 'OWNER' && fleetRole) {
      updateData.fleetRole = fleetRole
    }

    // Both OWNER and ADMIN can update canBeAssignedLoads
    if (canBeAssignedLoads !== undefined) {
      updateData.canBeAssignedLoads = canBeAssignedLoads
    }

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

    // TIER 2.11: Expanded Admin Permissions (Operational Super-Admin)
    // Both OWNER and ADMIN can now removed drivers
    if (driver.fleetRole !== 'OWNER' && driver.fleetRole !== 'ADMIN') {
      throw new AuthorizationError('Only fleet owners and admins can remove drivers')
    }

    // Verify fleet ownership/membership
    const driverFleetId = driver.ownedFleet?.id || driver.fleetId
    if (driverFleetId !== fleetId) {
      throw new AuthorizationError('Access denied to this fleet')
    }

    // Cannot remove owner (self check handled by role check, but good safety)
    if (targetDriverId === driverId) {
      throw new ValidationError('Cannot remove yourself. Delete the fleet (Owner) or Leave Fleet (Admin/Driver) instead.')
    }

    const targetDriver = await prisma.driver.findUnique({
      where: { id: targetDriverId, fleetId },
    })

    if (!targetDriver) {
      throw new ValidationError('Driver not found in this fleet')
    }

    // TIER 1.3: Hardcode OWNER protection - prevent mutiny
    if (targetDriver.fleetRole === 'OWNER') {
      throw new ValidationError('Cannot remove fleet owner.')
    }

    // ADMIN PERMISSION SCOPE CHECKS
    if (driver.fleetRole === 'ADMIN') {
      // Admins cannot remove other Admins (Mutiny Protection)
      if (targetDriver.fleetRole !== 'DRIVER') {
        throw new AuthorizationError('Admins can only remove standard Drivers, not other Admins.')
      }
    }

    // TIER 2.7: Transfer fleet-owned DriverClient records to fleet owner before removing driver
    // Get all fleet-owned clients created by this driver
    const fleetOwnedClients = await prisma.driverClient.findMany({
      where: {
        driverId: targetDriverId,
        ownerFleetId: fleetId,
      },
    })

    // Transfer ownership: Set driverId to fleet owner (or current admin executing the delete? No, always to Owner for consistency)
    // We need the Owner ID. If requester is Admin, we need to fetch Owner ID.
    // If requester is Owner, we have it.
    let fleetOwnerId = driver.id
    if (driver.fleetRole !== 'OWNER') {
      // Fetch fleet owner
      const fleet = await prisma.fleet.findUnique({
        where: { id: fleetId },
        select: { ownerId: true }
      })
      if (fleet) fleetOwnerId = fleet.ownerId
    }

    if (fleetOwnedClients.length > 0) {
      await prisma.driverClient.updateMany({
        where: {
          id: { in: fleetOwnedClients.map(c => c.id) },
        },
        data: {
          driverId: fleetOwnerId, // Transfer to fleet owner
          // ownerFleetId stays the same (fleetId)
        },
      })
    }

    // Revoke access: Deactivate any remaining DriverClient records that belong to the fleet
    // (Driver loses access to fleet-owned clients)
    await prisma.driverClient.updateMany({
      where: {
        driverId: targetDriverId,
        ownerFleetId: fleetId,
      },
      data: {
        isActive: false, // Revoke access
      },
    })

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

