import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/load-requests/[id]/reject-driver-quote
 * Shipper rejects driver's quote
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { shipperId, rejectionNotes } = await request.json()

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

    // Verify shipper owns this load
    if (loadRequest.shipperId !== shipperId) {
      return NextResponse.json(
        { error: 'Unauthorized - you do not own this load' },
        { status: 403 }
      )
    }

    // Check if load is in correct status for quote rejection
    if (loadRequest.status !== 'DRIVER_QUOTE_SUBMITTED') {
      return NextResponse.json(
        { error: `Cannot reject quote for load with status: ${loadRequest.status}. Load must have a submitted driver quote.` },
        { status: 400 }
      )
    }

    // Update load: reject quote, clear driver assignment, reset to NEW
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        status: 'NEW', // Back to available for other drivers
        shipperQuoteDecision: 'DENIED',
        shipperQuoteDecisionAt: new Date(),
        // Clear driver assignment so load is available again
        driverId: null,
        assignedAt: null,
        acceptedByDriverAt: null,
        driverQuoteAmount: null,
        driverQuoteNotes: null,
        driverQuoteSubmittedAt: null,
        driverQuoteExpiresAt: null,
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Store rejection notes in quoteNotes for audit trail
    if (rejectionNotes) {
      await prisma.loadRequest.update({
        where: { id },
        data: {
          quoteNotes: `Quote rejected by shipper: ${rejectionNotes}`,
        },
      })
    }

    // Create tracking event for quote rejection
    const driverName = loadRequest.driver ? `${loadRequest.driver.firstName} ${loadRequest.driver.lastName}` : 'Driver'
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'CANCELLED',
        label: `Quote Rejected by Shipper`,
        description: `Shipper rejected driver quote from ${driverName}.${rejectionNotes ? ` Reason: ${rejectionNotes}` : ''} Load is now available for other drivers.`,
        locationText: loadRequest.shipper.companyName || 'Shipper Portal',
        actorType: 'SHIPPER',
        actorId: shipperId,
      },
    })

    return NextResponse.json({
      success: true,
      loadRequest: {
        ...updatedLoad,
        driverId: null, // Ensure driverId is cleared
      },
      message: 'Quote rejected. Load is now available for other drivers.',
    })

  } catch (error) {
    console.error('Error rejecting driver quote:', error)
    return NextResponse.json(
      { error: 'Failed to reject quote', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}






