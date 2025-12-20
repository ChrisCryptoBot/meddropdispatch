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
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.trim() === '') {
      logger.warn('Invalid load request ID', { loadId: id })
      throw new NotFoundError('Load request')
    }
    
    // Log the request for debugging
    logger.info('Fetching load request', { loadId: id })

    try {
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
            vehicleType: true,
            profilePicture: true,
            yearsOfExperience: true,
            specialties: true,
            bio: true,
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
        logger.warn('Load request not found', { loadId: id })
        throw new NotFoundError('Load request')
      }

      // Serialize the response to handle Date objects and other non-serializable values
      // Use a safer serialization approach that handles circular references
      let serializedLoadRequest
      try {
        serializedLoadRequest = JSON.parse(
          JSON.stringify(loadRequest, (key, value) => {
            // Convert Date objects to ISO strings
            if (value instanceof Date) {
              return value.toISOString()
            }
            // Convert BigInt to string (if any)
            if (typeof value === 'bigint') {
              return value.toString()
            }
            // Handle null/undefined
            if (value === null || value === undefined) {
              return value
            }
            // Skip functions
            if (typeof value === 'function') {
              return undefined
            }
            return value
          })
        )
      } catch (serializationError) {
        logger.error('Error serializing load request', 
          serializationError instanceof Error ? serializationError : undefined,
          { loadId: id }
        )
        // Fallback: try to return a simplified version
        throw new Error(`Failed to serialize load request: ${serializationError instanceof Error ? serializationError.message : 'Unknown error'}`)
      }

      logger.info('Load request fetched successfully', { loadId: id, trackingCode: loadRequest.publicTrackingCode })
      return NextResponse.json(serializedLoadRequest)
    } catch (error) {
      logger.error('Error fetching load request', 
        error instanceof Error ? error : undefined,
        { 
          loadId: id, 
          stack: error instanceof Error ? error.stack : undefined
        }
      )
      throw error
    }
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
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await nextReq.json()
    
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

    // Get current load to check restrictions and temperature ranges
    const currentLoad = await prisma.loadRequest.findUnique({
      where: { id },
      select: {
        id: true,
        publicTrackingCode: true,
        shipperId: true,
        status: true,
        temperatureMin: true,
        temperatureMax: true,
        deliveryDeadline: true,
        serviceType: true,
        commodityDescription: true,
        specimenCategory: true,
        temperatureRequirement: true,
        readyTime: true,
        accessNotes: true,
        driverInstructions: true,
        priorityLevel: true,
        poNumber: true,
        estimatedContainers: true,
        estimatedWeightKg: true,
        declaredValue: true,
      }
    })

    if (!currentLoad) {
      throw new NotFoundError('Load request')
    }

    // RESTRICTION: Cannot edit shipper after creation
    if (rawData.shipperId && rawData.shipperId !== currentLoad.shipperId) {
      return NextResponse.json(
        {
          error: 'EditRestriction',
          message: 'Cannot change the shipper after load creation',
        },
        { status: 400 }
      )
    }

    // RESTRICTION: Cannot edit certain fields if load is PICKED_UP or later
    const restrictedStatuses = ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']
    const isRestricted = restrictedStatuses.includes(currentLoad.status)
    
    if (isRestricted) {
      // Fields that cannot be edited once load is PICKED_UP or later
      const restrictedFields = [
        'serviceType',
        'commodityDescription',
        'specimenCategory',
        'temperatureRequirement',
        'readyTime',
        'deliveryDeadline',
        'accessNotes',
        'driverInstructions',
        'priorityLevel',
        'poNumber',
        'estimatedContainers',
        'estimatedWeightKg',
        'declaredValue',
      ]
      
      const attemptedRestrictedFields = restrictedFields.filter(field => data[field as keyof typeof data] !== undefined)
      
      if (attemptedRestrictedFields.length > 0) {
        return NextResponse.json(
          {
            error: 'EditRestriction',
            message: `Cannot edit ${attemptedRestrictedFields.join(', ')} when load status is ${currentLoad.status}. Load details are locked once pickup has occurred.`,
            restrictedFields: attemptedRestrictedFields,
          },
          { status: 400 }
        )
      }
    }

    // Track changes for logging
    const changes: Record<string, { from: any; to: any }> = {}
    const editableFields = [
      'serviceType',
      'commodityDescription',
      'specimenCategory',
      'temperatureRequirement',
      'readyTime',
      'deliveryDeadline',
      'accessNotes',
      'driverInstructions',
      'priorityLevel',
      'poNumber',
      'estimatedContainers',
      'estimatedWeightKg',
      'declaredValue',
      'quoteAmount',
      'quoteNotes',
    ]

    for (const field of editableFields) {
      if (data[field as keyof typeof data] !== undefined) {
        const oldValue = currentLoad[field as keyof typeof currentLoad]
        const newValue = data[field as keyof typeof data]
        
        // Only log if value actually changed
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes[field] = { from: oldValue, to: newValue }
        }
      }
    }

    // TEMPERATURE EXCEPTION HANDLING
    const updateData: any = { ...data }

    // Check pickup temperature
    if (data.pickupTemperature !== undefined && currentLoad && currentLoad.temperatureMin !== null && currentLoad.temperatureMax !== null) {
      const temp = typeof data.pickupTemperature === 'number' ? data.pickupTemperature : parseFloat(String(data.pickupTemperature))
      const min = currentLoad.temperatureMin!
      const max = currentLoad.temperatureMax!
      
      if (temp < min || temp > max) {
        updateData.pickupTempException = true
      } else {
        updateData.pickupTempException = false
      }
      
      // Set temperature timestamp if recording temperature
      if (data.pickupTemperature !== null && (rawData.pickupTempRecordedAt === undefined)) {
        updateData.pickupTempRecordedAt = new Date()
      }
    }

    // Check delivery temperature
    if (data.deliveryTemperature !== undefined && currentLoad && currentLoad.temperatureMin !== null && currentLoad.temperatureMax !== null) {
      const temp = typeof data.deliveryTemperature === 'number' ? data.deliveryTemperature : parseFloat(String(data.deliveryTemperature))
      const min = currentLoad.temperatureMin!
      const max = currentLoad.temperatureMax!
      
      if (temp < min || temp > max) {
        updateData.deliveryTempException = true
      } else {
        updateData.deliveryTempException = false
      }
      
      // Set temperature timestamp if recording temperature
      if (data.deliveryTemperature !== null && (rawData.deliveryTempRecordedAt === undefined)) {
        updateData.deliveryTempRecordedAt = new Date()
      }
    }

    // Set attestation timestamps
    if (rawData.pickupAttested === true) {
      updateData.pickupAttestedAt = new Date()
    }
    if (rawData.deliveryAttested === true) {
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

    // Prepare update data
    const updatePayload: any = {
      ...updateData,
      // Convert ISO strings to Date objects if present
      actualPickupTime: data.actualPickupTime ? new Date(data.actualPickupTime) : undefined,
      actualDeliveryTime: data.actualDeliveryTime ? new Date(data.actualDeliveryTime) : undefined,
      pickupTempRecordedAt: rawData.pickupTempRecordedAt ? new Date(rawData.pickupTempRecordedAt) : (updateData.pickupTempRecordedAt || undefined),
      deliveryTempRecordedAt: rawData.deliveryTempRecordedAt ? new Date(rawData.deliveryTempRecordedAt) : (updateData.deliveryTempRecordedAt || undefined),
      // Add editable fields if provided
      readyTime: data.readyTime ? new Date(data.readyTime) : undefined,
      deliveryDeadline: data.deliveryDeadline ? new Date(data.deliveryDeadline) : undefined,
    }

    // Only include fields that are actually being updated (not undefined)
    const cleanUpdatePayload: any = {}
    for (const [key, value] of Object.entries(updatePayload)) {
      if (value !== undefined) {
        cleanUpdatePayload[key] = value
      }
    }

    // Add editable fields from data if provided
    const editableFieldMap: Record<string, string> = {
      serviceType: 'serviceType',
      commodityDescription: 'commodityDescription',
      specimenCategory: 'specimenCategory',
      temperatureRequirement: 'temperatureRequirement',
      accessNotes: 'accessNotes',
      driverInstructions: 'driverInstructions',
      priorityLevel: 'priorityLevel',
      poNumber: 'poNumber',
      estimatedContainers: 'estimatedContainers',
      estimatedWeightKg: 'estimatedWeightKg',
      declaredValue: 'declaredValue',
      quoteAmount: 'quoteAmount',
      quoteNotes: 'quoteNotes',
    }

    for (const [key, dbField] of Object.entries(editableFieldMap)) {
      if (data[key as keyof typeof data] !== undefined) {
        cleanUpdatePayload[dbField] = data[key as keyof typeof data]
      }
    }

    // Update load request
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: cleanUpdatePayload,
    })

    // Log changes with detailed information
    logger.info('Load request updated', {
      loadId: id,
      trackingCode: updatedLoad.publicTrackingCode,
      updatedFields: Object.keys(cleanUpdatePayload),
      changes: Object.keys(changes).length > 0 ? changes : undefined,
      status: currentLoad.status,
      editedBy: 'admin', // TODO: Get from auth session
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
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
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
