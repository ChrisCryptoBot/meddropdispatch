import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sendLoadStatusEmail } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'

/**
 * POST /api/load-requests/[id]/accept-shipper
 * Shipper accepts a load created by driver
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
    const { shipperId } = rawData

    if (!shipperId) {
      return NextResponse.json(
        { error: 'Shipper ID is required' },
        { status: 400 }
      )
    }

    // Get load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        shipper: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Verify shipper matches
    if (loadRequest.shipperId !== shipperId) {
      throw new ValidationError('This load does not belong to this shipper')
    }

    // Shipper acceptance is optional - just links load to their portal account
    // Load can be in any status (it's already active and trackable)
    // This just allows shipper to view/manage it in their portal
    // Load continues normally regardless of shipper acceptance
    
    // Don't change status - load continues as-is
    // Just create a tracking event to note shipper claimed the load in portal
    const updatedLoad = loadRequest
      where: { id },
      include: {
        shipper: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!updatedLoad) {
      throw new NotFoundError('Load request')
    }

    // Create tracking event - shipper claimed load in portal (optional action)
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'SHIPPER_CONFIRMED',
        label: 'Shipper Claimed in Portal',
        description: `${loadRequest.shipper.companyName} has claimed this load in their portal. Load continues as normal.`,
        locationText: null,
        actorId: shipperId,
        actorType: 'SHIPPER',
      },
    })

    // Send notification email to driver (if driver email exists)
    // Note: Driver notification would use sendDriverLoadStatusEmail if needed
    // For now, we'll just log that the shipper accepted
    console.log(`Load ${updatedLoad.publicTrackingCode} accepted by shipper ${updatedLoad.shipper.companyName}`)

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
    })
  })(request)
}

