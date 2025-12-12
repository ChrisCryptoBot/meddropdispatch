import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLoadCancelledNotification } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { cancelLoadSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/load-requests/[id]/cancel
 * Cancel a load request with reason and billing rule
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
    const validation = await validateRequest(cancelLoadSchema, rawData)
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

    const { 
      cancellationReason, 
      cancelledBy, 
      cancelledById, 
      cancellationBillingRule,
      notes 
    } = validation.data

    // Get current load with related data for notifications
    const load = await prisma.loadRequest.findUnique({
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
      },
    })

    if (!load) {
      throw new NotFoundError('Load request')
    }

    if (load.status === 'CANCELLED') {
      throw new ValidationError('Load is already cancelled')
    }

    if (load.status === 'DELIVERED') {
      throw new ValidationError('Cannot cancel a delivered or completed load')
    }

    // Update load with cancellation info
    const cancelledLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason,
        cancelledBy,
        cancelledById: cancelledById || null,
        cancelledAt: new Date(),
        cancellationBillingRule: cancellationBillingRule || null,
      },
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
      },
    })

    // Create tracking event
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'CANCELLED',
        label: `Load Cancelled - ${cancellationReason.replace(/_/g, ' ')}`,
        description: notes || `Cancelled by ${cancelledBy}. Billing rule: ${cancellationBillingRule || 'Not specified'}`,
        actorId: cancelledById || null,
        actorType: cancelledBy === 'SYSTEM' ? 'SYSTEM' : cancelledBy === 'SHIPPER' ? 'SHIPPER' : cancelledBy === 'DRIVER' ? 'DRIVER' : 'ADMIN',
        locationText: null,
      }
    })

    // Send cancellation notifications to both shipper and driver
    const trackingUrl = getTrackingUrl(cancelledLoad.publicTrackingCode)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const driverPortalUrl = `${baseUrl}/driver/loads`

    const driverName = cancelledLoad.driver 
      ? `${cancelledLoad.driver.firstName || ''} ${cancelledLoad.driver.lastName || ''}`.trim() 
      : null

    await sendLoadCancelledNotification({
      shipperEmail: cancelledLoad.shipper.email,
      driverEmail: cancelledLoad.driver?.email || null,
      companyName: cancelledLoad.shipper.companyName,
      driverName: driverName || undefined,
      trackingCode: cancelledLoad.publicTrackingCode,
      cancellationReason,
      cancelledBy,
      notes: notes || null,
      trackingUrl,
      driverPortalUrl,
    })

    logger.info('Load cancelled', {
      loadId: id,
      cancelledBy,
      cancellationReason,
      trackingCode: cancelledLoad.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      loadRequest: cancelledLoad,
    })
  })(request)
}
