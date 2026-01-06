import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { submitQuoteSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateQuoteAmount } from '@/lib/edge-case-validations'

/**
 * POST /api/load-requests/[id]/submit-quote
 * Driver submits quote for a load they've accepted
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await req.json()

    // Validate request body
    const validation = await validateRequest(submitQuoteSchema, rawData)
    if (!validation.success) {
      const formatted = formatZodErrors(validation.errors)
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: formatted.message,
          errors: formatted.errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const { driverId, quoteAmount, notes } = validation.data

    // EDGE CASE VALIDATION: Validate quote amount (min/max/negative)
    validateQuoteAmount(quoteAmount, 'ROUTINE') // Service type not available in form, defaulting to check amount only

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
      throw new NotFoundError('Load request')
    }

    // Verify driver is assigned to this load
    if (loadRequest.driverId !== driverId) {
      throw new AuthorizationError('You are not assigned to this load')
    }

    // Check if load is in correct status for quote submission
    if (loadRequest.status !== 'DRIVER_QUOTE_PENDING') {
      throw new ValidationError(`Cannot submit quote for load with status: ${loadRequest.status}. Load must be in DRIVER_QUOTE_PENDING status.`)
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

    // Send email notification to shipper about quote submission
    const { sendDriverQuoteNotification } = await import('@/lib/email')
    const trackingUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/track/${loadRequest.publicTrackingCode}`

    await sendDriverQuoteNotification({
      to: loadRequest.shipper.email,
      shipperName: loadRequest.shipper.companyName,
      trackingCode: loadRequest.publicTrackingCode,
      driverName: `${updatedLoad.driver?.firstName || ''} ${updatedLoad.driver?.lastName || ''}`.trim(),
      quoteAmount: updatedLoad.driverQuoteAmount!,
      quoteNotes: updatedLoad.driverQuoteNotes || '',
      trackingUrl,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
      message: 'Quote submitted successfully. Awaiting shipper approval.',
    })
  })(request)
}






