import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/drivers/[id]/approve
 * Admin approves a driver (changes status from PENDING_APPROVAL to AVAILABLE)
 * Also verifies equipment checklist is approved
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
    const body = await request.json().catch(() => ({}))
    const { approvedBy, notes } = body

    // Get driver with equipment checklist
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        equipmentChecklist: true,
        documents: {
          where: {
            isActive: true,
            type: {
              in: ['DRIVERS_LICENSE', 'VEHICLE_INSURANCE'],
            },
          },
        },
      },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    if (driver.status !== 'PENDING_APPROVAL') {
      throw new ValidationError(`Driver is not pending approval. Current status: ${driver.status}`)
    }

    // Check required documents are verified
    const requiredDocs = ['DRIVERS_LICENSE', 'VEHICLE_INSURANCE']
    const verifiedDocs = driver.documents.filter(doc => doc.verifiedAt !== null)
    const missingDocs = requiredDocs.filter(
      docType => !verifiedDocs.some(doc => doc.type === docType)
    )

    if (missingDocs.length > 0) {
      throw new ValidationError(
        `Required documents not verified: ${missingDocs.join(', ')}`
      )
    }

    // Check equipment checklist is approved
    if (!driver.equipmentChecklist || !driver.equipmentChecklist.approvedAt) {
      throw new ValidationError(
        'Equipment checklist must be completed and approved before driver can be approved'
      )
    }

    // Update driver status to AVAILABLE
    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: {
        status: 'AVAILABLE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Driver approved successfully',
      driver: updatedDriver,
    })
  } catch (error) {
    return createErrorResponse(error)
  }
}

