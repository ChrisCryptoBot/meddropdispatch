// Load Templates API Route
// GET: List templates for a shipper
// POST: Create a new template

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/load-templates
 * Get all templates for a shipper (or all templates if admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shipperId = searchParams.get('shipperId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {}
    if (shipperId) {
      where.shipperId = shipperId
    }
    if (!includeInactive) {
      where.isActive = true
    }

    const templates = await prisma.loadTemplate.findMany({
      where,
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
          },
        },
        pickupFacility: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            addressLine1: true,
          },
        },
        dropoffFacility: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            addressLine1: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/load-templates
 * Create a new load template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      shipperId,
      name,
      serviceType,
      commodityDescription,
      specimenCategory,
      temperatureRequirement,
      pickupFacilityId,
      dropoffFacilityId,
      pickupFacilityData,
      dropoffFacilityData,
      readyTime,
      deliveryDeadline,
      accessNotes,
    } = body

    // Validate required fields
    if (!shipperId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: shipperId, name' },
        { status: 400 }
      )
    }

    // Create or find pickup facility
    let pickupFacility
    if (pickupFacilityId) {
      pickupFacility = await prisma.facility.findUnique({
        where: { id: pickupFacilityId },
      })
      if (!pickupFacility) {
        return NextResponse.json(
          { error: 'Pickup facility not found' },
          { status: 404 }
        )
      }
    } else if (pickupFacilityData) {
      // Find or create pickup facility
      pickupFacility = await prisma.facility.findFirst({
        where: {
          shipperId,
          name: pickupFacilityData.name,
          addressLine1: pickupFacilityData.addressLine1,
          city: pickupFacilityData.city,
          state: pickupFacilityData.state,
        },
      })

      if (!pickupFacility) {
        pickupFacility = await prisma.facility.create({
          data: {
            shipperId,
            name: pickupFacilityData.name,
            facilityType: pickupFacilityData.facilityType || 'OTHER',
            addressLine1: pickupFacilityData.addressLine1,
            addressLine2: pickupFacilityData.addressLine2 || null,
            city: pickupFacilityData.city,
            state: pickupFacilityData.state.toUpperCase(),
            postalCode: pickupFacilityData.postalCode,
            contactName: pickupFacilityData.contactName,
            contactPhone: pickupFacilityData.contactPhone,
            defaultAccessNotes: pickupFacilityData.defaultAccessNotes || null,
          },
        })
      }
    } else {
      return NextResponse.json(
        { error: 'Missing pickup facility data or ID' },
        { status: 400 }
      )
    }

    // Create or find dropoff facility
    let dropoffFacility
    if (dropoffFacilityId) {
      dropoffFacility = await prisma.facility.findUnique({
        where: { id: dropoffFacilityId },
      })
      if (!dropoffFacility) {
        return NextResponse.json(
          { error: 'Dropoff facility not found' },
          { status: 404 }
        )
      }
    } else if (dropoffFacilityData) {
      // Find or create dropoff facility
      dropoffFacility = await prisma.facility.findFirst({
        where: {
          shipperId,
          name: dropoffFacilityData.name,
          addressLine1: dropoffFacilityData.addressLine1,
          city: dropoffFacilityData.city,
          state: dropoffFacilityData.state,
        },
      })

      if (!dropoffFacility) {
        dropoffFacility = await prisma.facility.create({
          data: {
            shipperId,
            name: dropoffFacilityData.name,
            facilityType: dropoffFacilityData.facilityType || 'OTHER',
            addressLine1: dropoffFacilityData.addressLine1,
            addressLine2: dropoffFacilityData.addressLine2 || null,
            city: dropoffFacilityData.city,
            state: dropoffFacilityData.state.toUpperCase(),
            postalCode: dropoffFacilityData.postalCode,
            contactName: dropoffFacilityData.contactName,
            contactPhone: dropoffFacilityData.contactPhone,
            defaultAccessNotes: dropoffFacilityData.defaultAccessNotes || null,
          },
        })
      }
    } else {
      return NextResponse.json(
        { error: 'Missing dropoff facility data or ID' },
        { status: 400 }
      )
    }

    const template = await prisma.loadTemplate.create({
      data: {
        shipperId,
        name,
        serviceType: serviceType || 'SAME_DAY',
        commodityDescription: commodityDescription || '',
        specimenCategory: specimenCategory || 'OTHER',
        temperatureRequirement: temperatureRequirement || 'AMBIENT',
        pickupFacilityId: pickupFacility.id,
        dropoffFacilityId: dropoffFacility.id,
        readyTime,
        deliveryDeadline,
        accessNotes,
      },
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
          },
        },
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

