import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/load-requests/[id]/accept-quote
 * Accept a quote for a load request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get current load to verify status
    const currentLoad = await prisma.loadRequest.findUnique({
      where: { id },
      select: { status: true, quoteAmount: true }
    })

    if (!currentLoad) {
      return NextResponse.json(
        { error: 'Load request not found' },
        { status: 404 }
      )
    }

    if (currentLoad.status !== 'QUOTED') {
      return NextResponse.json(
        { error: 'Load must be in QUOTED status to accept quote' },
        { status: 400 }
      )
    }

    if (!currentLoad.quoteAmount) {
      return NextResponse.json(
        { error: 'No quote available to accept' },
        { status: 400 }
      )
    }

    // Update load to QUOTE_ACCEPTED status
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        status: 'QUOTE_ACCEPTED',
      },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Create tracking event for quote acceptance
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'SHIPPER_CONFIRMED',
        label: 'Quote Accepted by Shipper',
        description: `Quote of $${currentLoad.quoteAmount.toLocaleString()} accepted and shipment confirmed`,
        locationText: updatedLoad.shipper?.companyName || 'Shipper Portal',
      },
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
    })

  } catch (error) {
    console.error('Error accepting quote:', error)
    return NextResponse.json(
      { error: 'Failed to accept quote', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
