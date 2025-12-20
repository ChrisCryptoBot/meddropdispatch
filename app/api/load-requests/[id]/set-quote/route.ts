import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sendLoadConfirmationEmail } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import { z } from 'zod'

const setQuoteSchema = z.object({
  quoteAmount: z.number().min(0, 'Quote amount must be positive'),
})

/**
 * PATCH /api/load-requests/[id]/set-quote
 * Set the quoted rate for a load (after negotiation)
 */
export async function PATCH(
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
    const validation = setQuoteSchema.safeParse(rawData)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid quote amount',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { quoteAmount } = validation.data

    // Get load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Update load with quoted rate
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        quoteAmount: quoteAmount,
      },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Create tracking event for quote being set
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'PRICE_QUOTED',
        label: 'Rate Quoted',
        description: `Driver set quoted rate: $${quoteAmount.toFixed(2)}`,
        locationText: loadRequest.driver ? `${loadRequest.driver.firstName} ${loadRequest.driver.lastName}` : 'Driver',
        actorId: loadRequest.driverId || null,
        actorType: 'DRIVER',
      },
    })

    // Send updated confirmation email with quoted rate
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const rateInfo = {
        quoteAmount: quoteAmount,
        ratePerMile: updatedLoad.ratePerMile,
        totalDistance: updatedLoad.totalDistance,
      }

      await sendLoadConfirmationEmail({
        to: updatedLoad.shipper.email,
        companyName: updatedLoad.shipper.companyName,
        trackingCode: updatedLoad.publicTrackingCode,
        loadDetails: {
          pickupFacility: {
            name: updatedLoad.pickupFacility.name,
            addressLine1: updatedLoad.pickupFacility.addressLine1,
            city: updatedLoad.pickupFacility.city,
            state: updatedLoad.pickupFacility.state,
            postalCode: updatedLoad.pickupFacility.postalCode,
          },
          dropoffFacility: {
            name: updatedLoad.dropoffFacility.name,
            addressLine1: updatedLoad.dropoffFacility.addressLine1,
            city: updatedLoad.dropoffFacility.city,
            state: updatedLoad.dropoffFacility.state,
            postalCode: updatedLoad.dropoffFacility.postalCode,
          },
          serviceType: updatedLoad.serviceType,
          commodityDescription: updatedLoad.commodityDescription,
          readyTime: updatedLoad.readyTime,
          deliveryDeadline: updatedLoad.deliveryDeadline,
          driverName: updatedLoad.driver ? `${updatedLoad.driver.firstName} ${updatedLoad.driver.lastName}` : null,
        },
        rateInfo,
        baseUrl,
      })
    } catch (emailError) {
      console.error('Error sending updated confirmation email:', emailError)
      // Don't fail the request if email fails - quote is still saved
    }

    return NextResponse.json({
      success: true,
      load: {
        id: updatedLoad.id,
        quoteAmount: updatedLoad.quoteAmount,
      },
      message: 'Quoted rate saved and confirmation email sent to shipper',
    })
  })(request)
}

