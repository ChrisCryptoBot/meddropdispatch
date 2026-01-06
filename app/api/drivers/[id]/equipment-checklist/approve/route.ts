import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/drivers/[id]/equipment-checklist/approve
 * Admin approves driver's equipment checklist
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    rateLimit(RATE_LIMITS.api)(request)
  } catch (error) {
    return createErrorResponse(error)
  }

  try {
    const { id } = await params
    const body = await request.json()

    // Check admin authentication (simplified - should use proper auth)
    const authHeader = request.headers.get('authorization')
    // In production, verify admin token here

    const { approvedBy, notes } = body

    if (!approvedBy) {
      throw new ValidationError('approvedBy is required')
    }

    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        equipmentChecklist: true,
      },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Get or create checklist
    let checklist = driver.equipmentChecklist

    if (!checklist) {
      checklist = await prisma.driverEquipmentChecklist.create({
        data: {
          driverId: id,
          checkedItems: '{}',
        },
      })
    }

    // Check if all required items are checked
    const checkedItems = JSON.parse(checklist.checkedItems || '{}')
    const { getRequiredItems } = await import('@/lib/equipment-items')
    const requiredItems = getRequiredItems()
    
    const missingRequired = requiredItems.filter(
      item => !checkedItems[item.id] || !checkedItems[item.id].checked
    )

    if (missingRequired.length > 0) {
      throw new ValidationError(
        `Missing required equipment: ${missingRequired.map(i => i.name).join(', ')}`
      )
    }

    // Approve checklist
    const updated = await prisma.driverEquipmentChecklist.update({
      where: { id: checklist.id },
      data: {
        approvedBy,
        approvedAt: new Date(),
        notes: notes || null,
      },
    })

    return NextResponse.json({
      checklist: {
        id: updated.id,
        driverId: updated.driverId,
        checkedItems: JSON.parse(updated.checkedItems || '{}'),
        approvedBy: updated.approvedBy,
        approvedAt: updated.approvedAt,
        notes: updated.notes,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error) {
    return createErrorResponse(error)
  }
}

