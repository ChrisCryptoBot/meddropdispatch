// Convert Quote to Load API Route
// POST: Convert QUOTE_REQUESTED to SCHEDULED (after phone call confirmation)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/load-requests/[id]/convert-to-load
 * Convert a QUOTE_REQUESTED load to SCHEDULED status
 * This is done after the admin has called the shipper and confirmed the quote
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
        driver: true,
      },
    })

    if (!loadRequest) {
      return NextResponse.json(
        { error: 'Load request not found' },
        { status: 404 }
      )
    }

    // Verify it's a quote request
    if (loadRequest.status !== 'QUOTE_REQUESTED') {
      return NextResponse.json(
        { error: `Can only convert QUOTE_REQUESTED loads. Current status: ${loadRequest.status}` },
        { status: 400 }
      )
    }

    // Optionally verify that rate has been calculated
    if (!loadRequest.quoteAmount && (!loadRequest.suggestedRateMin || !loadRequest.suggestedRateMax)) {
      return NextResponse.json(
        { error: 'Please calculate rate before converting to load' },
        { status: 400 }
      )
    }

    // Set quote amount from suggested rate if not already set
    const quoteAmount = loadRequest.quoteAmount || 
      (loadRequest.suggestedRateMin && loadRequest.suggestedRateMax 
        ? (loadRequest.suggestedRateMin + loadRequest.suggestedRateMax) / 2 
        : null)

    // Update status to SCHEDULED
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        quoteAmount: quoteAmount || undefined,
        quoteAcceptedAt: new Date(),
      },
    })

    // Create tracking event
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'SCHEDULED',
        label: 'Load Scheduled',
        description: 'Quote converted to scheduled load after phone confirmation',
        actorType: 'ADMIN',
      },
    })

    // Create in-app notification for admins
    await prisma.notification.create({
      data: {
        userId: null, // Broadcast to all admins
        type: 'LOAD_UPDATE',
        title: `Load Scheduled: ${loadRequest.publicTrackingCode}`,
        message: `${loadRequest.shipper.companyName} confirmed quote - now scheduled`,
        link: `/admin/loads/${id}`,
      },
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
      message: 'Quote successfully converted to scheduled load',
    })
  } catch (error) {
    console.error('Error converting quote to load:', error)
    return NextResponse.json(
      { error: 'Failed to convert quote to load' },
      { status: 500 }
    )
  }
}

