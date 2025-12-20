import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers/[id]/equipment-checklist
 * Get driver's equipment checklist
 */
export async function GET(
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

    return NextResponse.json({
      checklist: {
        id: checklist.id,
        driverId: checklist.driverId,
        checkedItems: JSON.parse(checklist.checkedItems || '{}'),
        approvedBy: checklist.approvedBy,
        approvedAt: checklist.approvedAt,
        notes: checklist.notes,
        createdAt: checklist.createdAt,
        updatedAt: checklist.updatedAt,
      },
    })
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * PATCH /api/drivers/[id]/equipment-checklist
 * Update driver's equipment checklist
 */
export async function PATCH(
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

    const { checkedItems } = body

    if (!checkedItems || typeof checkedItems !== 'object') {
      throw new ValidationError('checkedItems must be an object')
    }

    // Get or create checklist
    const existing = await prisma.driverEquipmentChecklist.findUnique({
      where: { driverId: id },
    })

    let checklist
    if (existing) {
      checklist = await prisma.driverEquipmentChecklist.update({
        where: { driverId: id },
        data: {
          checkedItems: JSON.stringify(checkedItems),
        },
      })
    } else {
      checklist = await prisma.driverEquipmentChecklist.create({
        data: {
          driverId: id,
          checkedItems: JSON.stringify(checkedItems),
        },
      })
    }

    return NextResponse.json({
      checklist: {
        id: checklist.id,
        driverId: checklist.driverId,
        checkedItems: JSON.parse(checklist.checkedItems || '{}'),
        approvedBy: checklist.approvedBy,
        approvedAt: checklist.approvedAt,
        notes: checklist.notes,
        createdAt: checklist.createdAt,
        updatedAt: checklist.updatedAt,
      },
    })
  } catch (error) {
    return createErrorResponse(error)
  }
}

