// Create Load from Template API Route
// POST: Create a new load request from a template

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/load-templates/[id]/create-load
 * Create a new load request from a template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get template
    const template = await prisma.loadTemplate.findUnique({
      where: { id },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    if (!template.isActive) {
      return NextResponse.json(
        { error: 'Template is inactive' },
        { status: 400 }
      )
    }

    // Allow override of template values via body
    const loadData = {
      shipperId: template.shipperId,
      pickupFacilityId: template.pickupFacilityId,
      dropoffFacilityId: template.dropoffFacilityId,
      serviceType: body.serviceType || template.serviceType,
      commodityDescription: body.commodityDescription || template.commodityDescription,
      specimenCategory: body.specimenCategory || template.specimenCategory,
      temperatureRequirement: body.temperatureRequirement || template.temperatureRequirement,
      readyTime: body.readyTime || (template.readyTime ? new Date(`${new Date().toISOString().split('T')[0]}T${template.readyTime}`) : null),
      deliveryDeadline: body.deliveryDeadline || (template.deliveryDeadline ? new Date(`${new Date().toISOString().split('T')[0]}T${template.deliveryDeadline}`) : null),
      accessNotes: body.accessNotes || template.accessNotes,
      status: 'REQUESTED',
      createdVia: 'WEB_FORM',
      preferredContactMethod: 'EMAIL',
    }

    // Generate tracking code
    const year = new Date().getFullYear()
    const prefix = `SHIPPER-${year.toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-`

    const latestLoad = await prisma.loadRequest.findFirst({
      where: {
        publicTrackingCode: {
          startsWith: prefix,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    let nextNumber = 1
    if (latestLoad) {
      const parts = latestLoad.publicTrackingCode.split('-')
      const lastPart = parts[parts.length - 1]
      const latestNumber = parseInt(lastPart) || 0
      nextNumber = latestNumber + 1
    }

    const trackingCode = `${prefix}${String(nextNumber).padStart(3, '0')}`

    // Create load request
    const loadRequest = await prisma.loadRequest.create({
      data: {
        ...loadData,
        publicTrackingCode: trackingCode,
      },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Create initial tracking event
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: loadRequest.id,
        code: 'REQUEST_RECEIVED',
        label: 'Scheduling Request Received',
        description: `Load created from template: ${template.name}`,
        actorType: 'SHIPPER',
      },
    })

    return NextResponse.json({
      success: true,
      loadRequest,
      message: 'Load created successfully from template',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating load from template:', error)
    return NextResponse.json(
      { error: 'Failed to create load from template' },
      { status: 500 }
    )
  }
}

