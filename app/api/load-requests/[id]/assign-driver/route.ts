import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { assignDriverSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/load-requests/[id]/assign-driver
 * Assign a driver to a load
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
    const validation = await validateRequest(assignDriverSchema, rawData)
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

    const { driverId } = validation.data

    // Get current load status
    const currentLoad = await prisma.loadRequest.findUnique({
      where: { id },
      select: { status: true }
    })

    if (!currentLoad) {
      throw new NotFoundError('Load request')
    }

    // Determine new status based on current status
    const shouldSchedule = ['NEW', 'QUOTED', 'QUOTE_ACCEPTED'].includes(currentLoad.status)

    // Update load with driver assignment
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        driverId,
        assignedAt: new Date(),
        // Auto-update status if still NEW or QUOTED
        ...(shouldSchedule ? { status: 'SCHEDULED' } : {}),
      },
      include: {
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Create tracking event for driver assignment
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'SHIPPER_CONFIRMED',
        label: `Assigned to driver: ${updatedLoad.driver?.firstName} ${updatedLoad.driver?.lastName}`,
        description: `Load scheduled with driver ${updatedLoad.driver?.firstName} ${updatedLoad.driver?.lastName}`,
        locationText: 'MED DROP Dispatch',
        actorType: 'ADMIN',
      },
    })

    logger.info('Driver assigned to load', {
      loadId: id,
      driverId,
      previousStatus: currentLoad.status,
      newStatus: updatedLoad.status,
      trackingCode: updatedLoad.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
    })
  })(request)
}
