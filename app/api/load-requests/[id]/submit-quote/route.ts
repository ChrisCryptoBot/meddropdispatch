import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { submitQuoteSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/load-requests/[id]/submit-quote
 * Driver submits quote for a load they've accepted
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
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
    const { sendEmail } = await import('@/lib/email')
    const trackingUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/track/${loadRequest.publicTrackingCode}`
    
    await sendEmail({
      to: loadRequest.shipper.email,
      subject: `Driver Quote Submitted - ${loadRequest.publicTrackingCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Driver Quote Submitted</h2>
          <p>Dear ${loadRequest.shipper.companyName},</p>
          <p>A driver has submitted a quote for your load request <strong>${loadRequest.publicTrackingCode}</strong>.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Quote Amount:</strong> $${driverQuoteAmount.toFixed(2)}</p>
            ${driverQuoteNotes ? `<p><strong>Driver Notes:</strong> ${driverQuoteNotes}</p>` : ''}
            <p><strong>Quote Expires:</strong> ${quoteExpiresAt ? new Date(quoteExpiresAt).toLocaleString() : '48 hours from now'}</p>
          </div>
          <p>Please review and accept or reject this quote in your portal.</p>
          <p><a href="${trackingUrl}" style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Load Details</a></p>
          <p>Thank you,<br>MED DROP</p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
      message: 'Quote submitted successfully. Awaiting shipper approval.',
    })
  })(request)
}






