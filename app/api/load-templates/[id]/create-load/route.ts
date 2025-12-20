import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateTrackingCode } from '@/lib/tracking'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const createLoadFromTemplateSchema = z.object({
  readyTime: z.string().datetime().optional().nullable(),
  deliveryDeadline: z.string().datetime().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
})

/**
 * POST /api/load-templates/[id]/create-load
 * Create a load request from a template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: templateId } = await params
    const rawData = await req.json()
    const validation = createLoadFromTemplateSchema.safeParse(rawData)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid load data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Get template
    const template = await prisma.loadTemplate.findUnique({
      where: { id: templateId },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!template) {
      throw new NotFoundError('Load template')
    }

    if (!template.isActive) {
      return NextResponse.json(
        { error: 'Template is inactive and cannot be used to create loads' },
        { status: 400 }
      )
    }

    // Generate tracking code
    const publicTrackingCode = await generateTrackingCode(template.shipperId)

    // Calculate ready time and delivery deadline
    // If provided in request, use those; otherwise use template times for today
    let readyTime: Date | null = null
    let deliveryDeadline: Date | null = null

    if (data.readyTime) {
      readyTime = new Date(data.readyTime)
    } else if (template.readyTime) {
      // Parse template time (e.g., "09:00") and apply to today
      const [hours, minutes] = template.readyTime.split(':').map(Number)
      readyTime = new Date()
      readyTime.setHours(hours, minutes || 0, 0, 0)
    }

    if (data.deliveryDeadline) {
      deliveryDeadline = new Date(data.deliveryDeadline)
    } else if (template.deliveryDeadline) {
      // Parse template time and apply to today
      const [hours, minutes] = template.deliveryDeadline.split(':').map(Number)
      deliveryDeadline = new Date()
      deliveryDeadline.setHours(hours, minutes || 0, 0, 0)
    }

    // Verify driver if provided
    let assignedDriverId: string | null = null
    if (data.driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: data.driverId },
        select: { id: true, status: true },
      })

      if (driver) {
        assignedDriverId = driver.id
      }
    }

    // Create load request from template
    const loadRequest = await prisma.loadRequest.create({
      data: {
        publicTrackingCode,
        shipperId: template.shipperId,
        pickupFacilityId: template.pickupFacilityId,
        dropoffFacilityId: template.dropoffFacilityId,
        serviceType: template.serviceType,
        commodityDescription: template.commodityDescription,
        specimenCategory: template.specimenCategory,
        temperatureRequirement: template.temperatureRequirement,
        readyTime,
        deliveryDeadline,
        accessNotes: data.accessNotes || template.accessNotes || null,
        status: assignedDriverId ? 'SCHEDULED' : 'REQUESTED',
        createdVia: 'TEMPLATE',
        driverId: assignedDriverId,
        assignedAt: assignedDriverId ? new Date() : null,
      },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
        driver: assignedDriverId
          ? {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            }
          : false,
      },
    })

    // Create initial tracking event
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: loadRequest.id,
        code: assignedDriverId ? 'SCHEDULED' : 'REQUEST_RECEIVED',
        label: assignedDriverId ? 'Load Scheduled' : 'Request Received',
        description: assignedDriverId
          ? 'Your delivery has been scheduled and assigned to a driver. Tracking is now available.'
          : 'Your load request has been received. A driver will call shortly to confirm details and pricing.',
        locationText: `${template.pickupFacility.city}, ${template.pickupFacility.state}`,
        actorType: 'SHIPPER',
      },
    })

    return NextResponse.json(
      {
        success: true,
        loadRequest,
        message: 'Load created successfully from template',
      },
      { status: 201 }
    )
  })(request)
}
