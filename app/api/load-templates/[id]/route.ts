import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  serviceType: z.string().optional(),
  commodityDescription: z.string().optional(),
  specimenCategory: z.string().optional(),
  temperatureRequirement: z.string().optional(),
  pickupFacilityId: z.string().optional(),
  dropoffFacilityId: z.string().optional(),
  readyTime: z.string().optional().nullable(),
  deliveryDeadline: z.string().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/load-templates/[id]
 * Get a specific load template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    const template = await prisma.loadTemplate.findUnique({
      where: { id },
      include: {
        pickupFacility: true,
        dropoffFacility: true,
        shipper: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    })

    if (!template) {
      throw new NotFoundError('Load template')
    }

    return NextResponse.json({ template })
  })(request as any)
}

/**
 * PATCH /api/load-templates/[id]
 * Update a load template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await nextReq.json()
    const validation = updateTemplateSchema.safeParse(rawData)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid template data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check if template exists
    const existingTemplate = await prisma.loadTemplate.findUnique({
      where: { id },
      include: { shipper: true },
    })

    if (!existingTemplate) {
      throw new NotFoundError('Load template')
    }

    // Verify facilities if being updated
    if (data.pickupFacilityId) {
      const pickupFacility = await prisma.facility.findFirst({
        where: {
          id: data.pickupFacilityId,
          shipperId: existingTemplate.shipperId,
        },
      })

      if (!pickupFacility) {
        throw new ValidationError('Pickup facility not found or does not belong to shipper')
      }
    }

    if (data.dropoffFacilityId) {
      const dropoffFacility = await prisma.facility.findFirst({
        where: {
          id: data.dropoffFacilityId,
          shipperId: existingTemplate.shipperId,
        },
      })

      if (!dropoffFacility) {
        throw new ValidationError('Dropoff facility not found or does not belong to shipper')
      }
    }

    // Build update data
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.serviceType !== undefined) updateData.serviceType = data.serviceType
    if (data.commodityDescription !== undefined) updateData.commodityDescription = data.commodityDescription
    if (data.specimenCategory !== undefined) updateData.specimenCategory = data.specimenCategory
    if (data.temperatureRequirement !== undefined) updateData.temperatureRequirement = data.temperatureRequirement
    if (data.pickupFacilityId !== undefined) updateData.pickupFacilityId = data.pickupFacilityId
    if (data.dropoffFacilityId !== undefined) updateData.dropoffFacilityId = data.dropoffFacilityId
    if (data.readyTime !== undefined) updateData.readyTime = data.readyTime || null
    if (data.deliveryDeadline !== undefined) updateData.deliveryDeadline = data.deliveryDeadline || null
    if (data.accessNotes !== undefined) updateData.accessNotes = data.accessNotes || null
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const template = await prisma.loadTemplate.update({
      where: { id },
      data: updateData,
      include: {
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    return NextResponse.json({ template })
  })(request)
}

/**
 * DELETE /api/load-templates/[id]
 * Delete a load template (soft delete by setting isActive to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    const template = await prisma.loadTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      throw new NotFoundError('Load template')
    }

    // Soft delete by setting isActive to false
    const updatedTemplate = await prisma.loadTemplate.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Template deactivated successfully',
      template: updatedTemplate,
    })
  })(request as any)
}
