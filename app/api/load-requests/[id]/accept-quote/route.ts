import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { acceptQuoteSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { sendDriverLoadStatusEmail } from '@/lib/email'

/**
 * POST /api/load-requests/[id]/accept-quote
 * Accept a quote for a load request
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
        driver: true,
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

    // Send notification to driver if assigned
    if (updatedLoad.driverId && updatedLoad.driver) {
      try {
        await sendDriverLoadStatusEmail({
          to: updatedLoad.driver.email,
          driverName: `${updatedLoad.driver.firstName} ${updatedLoad.driver.lastName}`,
          trackingCode: updatedLoad.publicTrackingCode,
          status: 'SCHEDULED', // Map QUOTE_ACCEPTED to SCHEDULED for driver context
          statusLabel: 'Quote Approved - Load Scheduled',
          companyName: updatedLoad.shipper.companyName,
          pickupAddress: `${updatedLoad.pickupFacility.addressLine1}, ${updatedLoad.pickupFacility.city}`,
          dropoffAddress: `${updatedLoad.dropoffFacility.addressLine1}, ${updatedLoad.dropoffFacility.city}`,
          readyTime: updatedLoad.readyTime,
          deliveryDeadline: updatedLoad.deliveryDeadline,
          driverPortalUrl: `${process.env.NEXTAUTH_URL}/driver/loads/${updatedLoad.id}`,
        })
        logger.info('Driver notified of quote acceptance', { driverId: updatedLoad.driverId })
      } catch (error) {
        logger.error('Failed to notify driver of quote acceptance', error as Error)
        // Non-blocking error
      }
    }

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
