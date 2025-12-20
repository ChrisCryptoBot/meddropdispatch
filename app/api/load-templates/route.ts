import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const createTemplateSchema = z.object({
  shipperId: z.string(),
  name: z.string().min(1, 'Template name is required'),
  serviceType: z.string(),
  commodityDescription: z.string().min(1),
  specimenCategory: z.string(),
  temperatureRequirement: z.string(),
  pickupFacilityId: z.string(),
  dropoffFacilityId: z.string(),
  readyTime: z.string().optional().nullable(),
  deliveryDeadline: z.string().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
})

const updateTemplateSchema = createTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
})

/**
 * GET /api/load-templates
 * List load templates for a shipper
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { searchParams } = new URL(req.url)
    const shipperId = searchParams.get('shipperId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    if (!shipperId) {
      return NextResponse.json(
        { error: 'shipperId is required' },
        { status: 400 }
      )
    }

    const templates = await prisma.loadTemplate.findMany({
      where: {
        shipperId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        pickupFacility: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
        dropoffFacility: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ templates })
  })(request)
}

/**
 * POST /api/load-templates
 * Create a new load template
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const rawData = await req.json()
    const validation = createTemplateSchema.safeParse(rawData)

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

    // Verify shipper exists
    const shipper = await prisma.shipper.findUnique({
      where: { id: data.shipperId },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    // Verify facilities belong to shipper
    const pickupFacility = await prisma.facility.findFirst({
      where: {
        id: data.pickupFacilityId,
        shipperId: data.shipperId,
      },
    })

    if (!pickupFacility) {
      throw new ValidationError('Pickup facility not found or does not belong to shipper')
    }

    const dropoffFacility = await prisma.facility.findFirst({
      where: {
        id: data.dropoffFacilityId,
        shipperId: data.shipperId,
      },
    })

    if (!dropoffFacility) {
      throw new ValidationError('Dropoff facility not found or does not belong to shipper')
    }

    // Create template
    const template = await prisma.loadTemplate.create({
      data: {
        shipperId: data.shipperId,
        name: data.name,
        serviceType: data.serviceType,
        commodityDescription: data.commodityDescription,
        specimenCategory: data.specimenCategory,
        temperatureRequirement: data.temperatureRequirement,
        pickupFacilityId: data.pickupFacilityId,
        dropoffFacilityId: data.dropoffFacilityId,
        readyTime: data.readyTime || null,
        deliveryDeadline: data.deliveryDeadline || null,
        accessNotes: data.accessNotes || null,
        isActive: true,
      },
      include: {
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  })(request)
}
