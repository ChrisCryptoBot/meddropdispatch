import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLoadStatusEmail, sendDriverLoadStatusEmail } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { approveDriverQuoteSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/load-requests/[id]/approve-driver-quote
 * Shipper approves driver's quote
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
    const validation = await validateRequest(approveDriverQuoteSchema, rawData)
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

    const { shipperId } = validation.data

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

    // Check if load is in correct status for quote approval
    if (loadRequest.status !== 'DRIVER_QUOTE_SUBMITTED') {
      throw new ValidationError(`Cannot approve quote for load with status: ${loadRequest.status}. Load must have a submitted driver quote.`)
    }

    if (!loadRequest.driverQuoteAmount) {
      throw new ValidationError('No driver quote found to approve')
    }

    // Check if quote has expired
    if (loadRequest.driverQuoteExpiresAt && new Date(loadRequest.driverQuoteExpiresAt) < new Date()) {
      throw new ValidationError('Driver quote has expired. Please request a new quote.')
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

    // Create in-app notification for driver
    if (loadRequest.driverId) {
      const { notifyDriverQuoteDecision } = await import('@/lib/notifications')
      await notifyDriverQuoteDecision({
        driverId: loadRequest.driverId,
        loadRequestId: id,
        trackingCode: loadRequest.publicTrackingCode,
        decision: 'APPROVED',
      }).catch((error) => {
        console.error('Error creating driver notification:', error)
      })
    }

    // Send notification emails to both shipper and driver
    const trackingUrl = getTrackingUrl(loadRequest.publicTrackingCode)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const driverPortalUrl = `${baseUrl}/driver/loads/${id}`
    
    // Notify shipper
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
      logger.warn('Failed to send shipper email notification', { 
        loadId: id,
        error: emailError instanceof Error ? emailError : new Error('Unknown email error')
      })
      // Don't fail the request if email fails
    }

    // Notify driver that their quote was approved
    if (loadRequest.driverId && loadRequest.driver?.email) {
      try {
        const driverName = `${loadRequest.driver.firstName || ''} ${loadRequest.driver.lastName || ''}`.trim()
        const pickupAddress = `${loadRequest.pickupFacility.addressLine1}, ${loadRequest.pickupFacility.city}, ${loadRequest.pickupFacility.state}`
        const dropoffAddress = `${loadRequest.dropoffFacility.addressLine1}, ${loadRequest.dropoffFacility.city}, ${loadRequest.dropoffFacility.state}`
        
        await sendDriverLoadStatusEmail({
          to: loadRequest.driver.email,
          driverName,
          trackingCode: loadRequest.publicTrackingCode,
          status: 'SCHEDULED',
          statusLabel: 'Quote Approved - Load Scheduled',
          companyName: loadRequest.shipper.companyName,
          pickupAddress,
          dropoffAddress,
          readyTime: loadRequest.readyTime,
          deliveryDeadline: loadRequest.deliveryDeadline,
          driverPortalUrl,
        })
      } catch (emailError) {
        logger.warn('Failed to send driver quote approval email', { 
          loadId: id,
          driverId: loadRequest.driverId,
          error: emailError instanceof Error ? emailError : new Error('Unknown email error')
        })
        // Don't fail the request if email fails
      }
    }

    logger.info('Driver quote approved by shipper', {
      loadId: id,
      shipperId,
      driverId: loadRequest.driverId,
      quoteAmount: loadRequest.driverQuoteAmount,
      trackingCode: updatedLoad.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
      message: 'Quote approved successfully. Load is now scheduled.',
    })
  })(request)
}
