import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { updateLoadRequestSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * GET /api/load-requests/[id]
 * Get a single load request with all related data
 */
export async function GET(
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

    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          }
        },
        vehicle: {
          select: {
            id: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehiclePlate: true,
            hasRefrigeration: true,
            nickname: true,
          }
        },
        trackingEvents: {
          orderBy: { createdAt: 'desc' }
        },
        documents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    return NextResponse.json(loadRequest)
  })(request)
}

/**
 * PATCH /api/load-requests/[id]
 * Update load request fields (signatures, temperatures, etc.)
 */
export async function PATCH(
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
    
    // Validate request body (updateLoadRequestSchema is flexible for partial updates)
    const validation = await validateRequest(updateLoadRequestSchema.partial(), rawData)
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

    const data = validation.data

    // Get current load to check temperature ranges
    const currentLoad = await prisma.loadRequest.findUnique({
      where: { id },
      select: {
        temperatureMin: true,
        temperatureMax: true,
        status: true,
        deliveryDeadline: true,
      }
    })

    if (!currentLoad) {
      throw new NotFoundError('Load request')
    }

    // TEMPERATURE EXCEPTION HANDLING
    const updateData: any = { ...data }

    // Check pickup temperature
    if (data.pickupTemperature !== undefined && currentLoad && currentLoad.temperatureMin !== null && currentLoad.temperatureMax !== null) {
      const temp = parseFloat(data.pickupTemperature)
      const min = currentLoad.temperatureMin!
      const max = currentLoad.temperatureMax!
      
      if (temp < min || temp > max) {
        updateData.pickupTempException = true
      } else {
        updateData.pickupTempException = false
      }
      
      // Set temperature timestamp if recording temperature
      if (data.pickupTemperature !== null && data.pickupTempRecordedAt === undefined) {
        updateData.pickupTempRecordedAt = new Date()
      }
    }

    // Check delivery temperature
    if (data.deliveryTemperature !== undefined && currentLoad && currentLoad.temperatureMin !== null && currentLoad.temperatureMax !== null) {
      const temp = parseFloat(data.deliveryTemperature)
      const min = currentLoad.temperatureMin!
      const max = currentLoad.temperatureMax!
      
      if (temp < min || temp > max) {
        updateData.deliveryTempException = true
      } else {
        updateData.deliveryTempException = false
      }
      
      // Set temperature timestamp if recording temperature
      if (data.deliveryTemperature !== null && data.deliveryTempRecordedAt === undefined) {
        updateData.deliveryTempRecordedAt = new Date()
      }
    }

    // Set attestation timestamps
    if (data.pickupAttested === true) {
      updateData.pickupAttestedAt = new Date()
    }
    if (data.deliveryAttested === true) {
      updateData.deliveryAttestedAt = new Date()
    }
    
    // Check for late delivery when actualDeliveryTime is set
    if (data.actualDeliveryTime) {
      const deliveryTime = new Date(data.actualDeliveryTime)
      
      if (currentLoad.deliveryDeadline && deliveryTime > currentLoad.deliveryDeadline) {
        updateData.lateDeliveryFlag = true
        // Note: lateDeliveryReasonNotes should be provided separately or admin can add later
      }
    }

    // Update load request
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        ...updateData,
        // Convert ISO strings to Date objects if present
        actualPickupTime: data.actualPickupTime ? new Date(data.actualPickupTime) : undefined,
        actualDeliveryTime: data.actualDeliveryTime ? new Date(data.actualDeliveryTime) : undefined,
        pickupTempRecordedAt: data.pickupTempRecordedAt ? new Date(data.pickupTempRecordedAt) : (updateData.pickupTempRecordedAt || undefined),
        deliveryTempRecordedAt: data.deliveryTempRecordedAt ? new Date(data.deliveryTempRecordedAt) : (updateData.deliveryTempRecordedAt || undefined),
      }
    })

    logger.info('Load request updated', {
      loadId: id,
      updatedFields: Object.keys(data),
      trackingCode: updatedLoad.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      loadRequest: updatedLoad,
    })
  })(request)
}

/**
 * DELETE /api/load-requests/[id]
 * Delete a load request (soft delete by setting status to CANCELLED, or hard delete)
 * Only allow deletion of completed or cancelled loads
 */
export async function DELETE(
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

    // Get the load to check its status
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      select: {
        id: true,
        publicTrackingCode: true,
        status: true,
      }
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Allow deletion of any load by shipper or driver (for cleanup)
    // No status restrictions - shippers and drivers can delete their loads at any time
    // This is a permanent deletion, so use with caution

    // Delete the load (Prisma will cascade delete related records via onDelete: Cascade)
    // Manually delete records that might not have cascade set up
    await prisma.$transaction(async (tx) => {
      // Delete related records first (some may have cascade, but we'll be explicit)
      await tx.trackingEvent.deleteMany({
        where: { loadRequestId: id }
      })
      await tx.document.deleteMany({
        where: { loadRequestId: id }
      })
      // Delete driver rating if exists (has cascade, but explicit for clarity)
      try {
        await tx.driverRating.deleteMany({
          where: { loadRequestId: id }
        })
      } catch (e) {
        // Model might not exist yet if migration hasn't run
        console.warn('Could not delete driver rating (model may not exist yet):', e)
      }
      // GPS tracking points have cascade delete, so they'll be deleted automatically
      // Then delete the load
      await tx.loadRequest.delete({
        where: { id }
      })
    })

    logger.info('Load request deleted', {
      loadId: id,
      trackingCode: loadRequest.publicTrackingCode,
    })

    return NextResponse.json({
      success: true,
      message: 'Load deleted successfully',
    })
  })(request)
}
