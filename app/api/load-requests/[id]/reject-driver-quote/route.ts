import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { rejectDriverQuoteSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/load-requests/[id]/reject-driver-quote
 * Shipper rejects driver's quote
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
    const validation = await validateRequest(rejectDriverQuoteSchema, rawData)
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

    const { shipperId, rejectionNotes } = validation.data

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

    // Verify shipper owns this load
    if (loadRequest.shipperId !== shipperId) {
      throw new AuthorizationError('Unauthorized - you do not own this load')
    }

    // Check if load is in correct status for quote rejection
    if (loadRequest.status !== 'DRIVER_QUOTE_SUBMITTED') {
      throw new ValidationError(`Cannot reject quote for load with status: ${loadRequest.status}. Load must have a submitted driver quote.`)
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

    logger.info('Driver quote rejected by shipper', {
      loadId: id,
      shipperId,
      driverId: loadRequest.driverId,
      trackingCode: updatedLoad.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      loadRequest: {
        ...updatedLoad,
        driverId: null, // Ensure driverId is cleared
      },
      message: 'Quote rejected. Load is now available for other drivers.',
    })
  })(request)
}
