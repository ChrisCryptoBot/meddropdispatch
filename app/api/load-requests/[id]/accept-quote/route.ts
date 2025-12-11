import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { acceptQuoteSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/load-requests/[id]/accept-quote
 * Accept a quote for a load request
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
    
    // Validate request body (empty for accept-quote, but validate structure)
    const validation = await validateRequest(acceptQuoteSchema, rawData)
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

    // Get current load to verify status
    const currentLoad = await prisma.loadRequest.findUnique({
      where: { id },
      select: { status: true, quoteAmount: true }
    })

    if (!currentLoad) {
      throw new NotFoundError('Load request')
    }

    if (currentLoad.status !== 'QUOTED') {
      throw new ValidationError('Load must be in QUOTED status to accept quote')
    }

    if (!currentLoad.quoteAmount) {
      throw new ValidationError('No quote available to accept')
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

    logger.info('Quote accepted by shipper', {
      loadId: id,
      quoteAmount: currentLoad.quoteAmount,
      trackingCode: updatedLoad.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
    })
  })(request)
}
