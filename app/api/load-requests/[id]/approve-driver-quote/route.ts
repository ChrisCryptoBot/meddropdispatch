import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLoadStatusEmail } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'

/**
 * POST /api/load-requests/[id]/approve-driver-quote
 * Shipper approves driver's quote
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { shipperId } = await request.json()

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

    // Check if load is in correct status for quote approval
    if (loadRequest.status !== 'DRIVER_QUOTE_SUBMITTED') {
      return NextResponse.json(
        { error: `Cannot approve quote for load with status: ${loadRequest.status}. Load must have a submitted driver quote.` },
        { status: 400 }
      )
    }

    if (!loadRequest.driverQuoteAmount) {
      return NextResponse.json(
        { error: 'No driver quote found to approve' },
        { status: 400 }
      )
    }

    // Check if quote has expired
    if (loadRequest.driverQuoteExpiresAt && new Date(loadRequest.driverQuoteExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Driver quote has expired. Please request a new quote.' },
        { status: 400 }
      )
    }

    // Update load: approve quote and schedule
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        quoteAmount: loadRequest.driverQuoteAmount, // Set as the official quote
        shipperQuoteDecision: 'APPROVED',
        shipperQuoteDecisionAt: new Date(),
        quoteAcceptedAt: new Date(),
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

    // Create tracking event for quote approval
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'SHIPPER_CONFIRMED',
        label: 'Quote Approved by Shipper',
        description: `Shipper approved driver quote of $${loadRequest.driverQuoteAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Load is now scheduled.`,
        locationText: loadRequest.shipper.companyName || 'Shipper Portal',
        actorType: 'SHIPPER',
        actorId: shipperId,
      },
    })

    // Send notification email to driver
    const trackingUrl = getTrackingUrl(loadRequest.publicTrackingCode)
    try {
      await sendLoadStatusEmail({
        to: loadRequest.shipper.email,
        trackingCode: loadRequest.publicTrackingCode,
        companyName: loadRequest.shipper.companyName,
        status: 'SCHEDULED',
        statusLabel: 'Quote Approved - Scheduled',
        trackingUrl,
        quoteAmount: loadRequest.driverQuoteAmount,
        quoteCurrency: 'USD',
      })
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
      message: 'Quote approved successfully. Load is now scheduled.',
    })

  } catch (error) {
    console.error('Error approving driver quote:', error)
    return NextResponse.json(
      { error: 'Failed to approve quote', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


