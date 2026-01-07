// Fleet Management Utilities
// Handles Fleet operations, invite generation, and billing logic

import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

/**
 * Generate secure 8-character invite code
 */
export function generateInviteCode(): string {
  const bytes = randomBytes(6) // 6 bytes = 12 hex chars, we'll use 8
  return bytes
    .toString('base64')
    .replace(/[+/=]/g, '') // Remove special chars
    .substring(0, 8)
    .toUpperCase()
}

/**
 * Validate invite code
 */
export async function validateInviteCode(code: string) {
  const invite = await prisma.fleetInvite.findUnique({
    where: { code: code.toUpperCase() },
    include: { fleet: true },
  })

  if (!invite) {
    throw new Error('Invalid invite code')
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new Error('Invite code has expired')
  }

  if (invite.maxUses && invite.usedCount >= invite.maxUses) {
    throw new Error('Invite code has reached maximum uses')
  }

  return invite
}

/**
 * Determine payee for invoice based on driver's fleet role
 */
export function determinePayee(driver: {
  id: string
  fleetRole: string | null
  fleetId: string | null
}): { type: 'DRIVER' | 'FLEET'; id: string } {
  if (driver.fleetRole === 'INDEPENDENT' || !driver.fleetId) {
    return { type: 'DRIVER', id: driver.id }
  }

  if (driver.fleetRole === 'DRIVER' || driver.fleetRole === 'ADMIN') {
    return { type: 'FLEET', id: driver.fleetId }
  }

  if (driver.fleetRole === 'OWNER') {
    // Default to Fleet for clean books (Owner can still drive, but payment goes to Fleet)
    return { type: 'FLEET', id: driver.fleetId }
  }

  throw new Error(`Invalid fleet role: ${driver.fleetRole}`)
}

/**
 * Validate driver fleet state consistency
 */
export function validateDriverFleetState(driver: {
  fleetRole: string | null
  fleetId: string | null
}): void {
  if (driver.fleetRole === 'INDEPENDENT' && driver.fleetId !== null) {
    throw new Error('INDEPENDENT drivers cannot have a fleetId')
  }

  if (['OWNER', 'ADMIN', 'DRIVER'].includes(driver.fleetRole || '') && !driver.fleetId) {
    throw new Error(`${driver.fleetRole} must have a fleetId`)
  }
}

/**
 * Create fleet and set driver as owner
 */
export async function createFleet(
  ownerId: string,
  name: string,
  taxId?: string
) {
  return await prisma.$transaction(async (tx) => {
    // Create fleet
    const fleet = await tx.fleet.create({
      data: {
        name,
        taxId: taxId || null,
        ownerId,
      },
    })

    // Update driver to be owner
    await tx.driver.update({
      where: { id: ownerId },
      data: {
        fleetId: fleet.id,
        fleetRole: 'OWNER',
      },
    })

    return fleet
  })
}

/**
 * Delete fleet and revert all drivers to INDEPENDENT
 * TIER 1.5: Block deletion if active loads exist (prevents Fleet Dissolution Debt)
 */
export async function deleteFleet(fleetId: string) {
  return await prisma.$transaction(async (tx) => {
    // TIER 1.5: Check for active loads with this fleet as contractedFleetId
    const activeLoads = await tx.loadRequest.count({
      where: {
        contractedFleetId: fleetId,
        status: {
          in: ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'],
        },
      },
    })

    if (activeLoads > 0) {
      throw new Error(
        `Cannot delete fleet: ${activeLoads} active load(s) are assigned to this fleet. Complete or cancel all active loads before deleting the fleet.`
      )
    }

    // Revert all drivers to INDEPENDENT
    await tx.driver.updateMany({
      where: { fleetId },
      data: {
        fleetRole: 'INDEPENDENT',
        fleetId: null,
      },
    })

    // Delete invites
    await tx.fleetInvite.deleteMany({
      where: { fleetId },
    })

    // Delete fleet (owner becomes INDEPENDENT via updateMany above)
    await tx.fleet.delete({
      where: { id: fleetId },
    })
  })
}

