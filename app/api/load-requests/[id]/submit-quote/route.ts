import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/load-requests/[id]/submit-quote
 * Driver submits quote for a load they've accepted
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { driverId, quoteAmount, notes } = await request.json()

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    if (!quoteAmount || quoteAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid quote amount is required' },
        { status: 400 }
      )
    }

    // Get current load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: true,
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!loadRequest) {
      return NextResponse.json(
        { error: 'Load request not found' },
        { status: 404 }
      )
    }

    // Verify driver is assigned to this load
    if (loadRequest.driverId !== driverId) {
      return NextResponse.json(
        { error: 'You are not assigned to this load' },
        { status: 403 }
      )
    }

    // Check if load is in correct status for quote submission
    if (loadRequest.status !== 'DRIVER_QUOTE_PENDING') {
      return NextResponse.json(
        { error: `Cannot submit quote for load with status: ${loadRequest.status}. Load must be in DRIVER_QUOTE_PENDING status.` },
        { status: 400 }
      )
    }

    // Calculate expiry time (48 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48)

    // Update load with driver quote
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        driverQuoteAmount: parseFloat(quoteAmount.toString()),
        driverQuoteNotes: notes || null,
        driverQuoteSubmittedAt: new Date(),
        driverQuoteExpiresAt: expiresAt,
        shipperQuoteDecision: 'PENDING',
        status: 'DRIVER_QUOTE_SUBMITTED',
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Create tracking event for quote submission
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'PRICE_QUOTED',
        label: `Quote Submitted by Driver: ${updatedLoad.driver?.firstName} ${updatedLoad.driver?.lastName}`,
        description: `Driver submitted quote of $${parseFloat(quoteAmount.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${notes ? `. Notes: ${notes}` : ''}`,
        locationText: 'MED DROP Driver Portal',
        actorType: 'DRIVER',
        actorId: driverId,
      },
    })

    // TODO: Send email notification to shipper about quote submission
    // await sendEmail({...})

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
      message: 'Quote submitted successfully. Awaiting shipper approval.',
    })

  } catch (error) {
    console.error('Error submitting quote:', error)
    return NextResponse.json(
      { error: 'Failed to submit quote', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


