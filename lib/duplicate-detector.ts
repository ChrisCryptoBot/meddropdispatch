// Duplicate Load Detection Utilities
// Detects potential duplicate load requests before creation

import { prisma } from './prisma'

export interface LoadRequestData {
  shipperId: string
  pickupFacilityId: string
  dropoffFacilityId: string
  readyTime: Date | null
  deliveryDeadline: Date | null
  serviceType: string
}

export interface DuplicateResult {
  isDuplicate: boolean
  duplicateLoadId?: string
  duplicateTrackingCode?: string
  similarity: 'exact' | 'near' | 'none'
  message?: string
}

const DEFAULT_TIME_WINDOW_MINUTES = 60 // 1 hour window for duplicate detection

/**
 * Detect duplicate load requests
 * Checks for loads with same shipper, facilities, service type, and overlapping time windows
 */
export async function detectDuplicateLoad(
  data: LoadRequestData,
  timeWindowMinutes: number = DEFAULT_TIME_WINDOW_MINUTES
): Promise<DuplicateResult> {
  // If no timing information, only check for exact matches on same day
  if (!data.readyTime || !data.deliveryDeadline) {
    // Check for loads created today with same shipper, facilities, and service type
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existingLoad = await prisma.loadRequest.findFirst({
      where: {
        shipperId: data.shipperId,
        pickupFacilityId: data.pickupFacilityId,
        dropoffFacilityId: data.dropoffFacilityId,
        serviceType: data.serviceType,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          notIn: ['CANCELLED', 'DENIED', 'DELIVERED', 'COMPLETED'],
        },
      },
      select: {
        id: true,
        publicTrackingCode: true,
        readyTime: true,
        deliveryDeadline: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (existingLoad) {
      return {
        isDuplicate: true,
        duplicateLoadId: existingLoad.id,
        duplicateTrackingCode: existingLoad.publicTrackingCode,
        similarity: 'near',
        message: `A similar load request was created today (${existingLoad.publicTrackingCode}). This may be a duplicate.`,
      }
    }

    return {
      isDuplicate: false,
      similarity: 'none',
    }
  }

  // Calculate time window for duplicate detection
  const windowStart = new Date(data.readyTime.getTime() - timeWindowMinutes * 60 * 1000)
  const windowEnd = new Date(data.deliveryDeadline.getTime() + timeWindowMinutes * 60 * 1000)

  // Check for exact or near matches
  const existingLoads = await prisma.loadRequest.findMany({
    where: {
      shipperId: data.shipperId,
      pickupFacilityId: data.pickupFacilityId,
      dropoffFacilityId: data.dropoffFacilityId,
      serviceType: data.serviceType,
      readyTime: {
        gte: windowStart,
        lte: windowEnd,
      },
      status: {
        notIn: ['CANCELLED', 'DENIED', 'DELIVERED', 'COMPLETED'],
      },
    },
    select: {
      id: true,
      publicTrackingCode: true,
      readyTime: true,
      deliveryDeadline: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (existingLoads.length === 0) {
    return {
      isDuplicate: false,
      similarity: 'none',
    }
  }

  // Find the most similar load (exact match on timing)
  const exactMatch = existingLoads.find((load) => {
    if (!load.readyTime || !load.deliveryDeadline || !data.readyTime || !data.deliveryDeadline) return false
    
    const readyTimeDiff = Math.abs(
      load.readyTime.getTime() - data.readyTime.getTime()
    )
    const deadlineDiff = Math.abs(
      load.deliveryDeadline.getTime() - data.deliveryDeadline.getTime()
    )
    
    // Consider exact if within 5 minutes
    return readyTimeDiff < 5 * 60 * 1000 && deadlineDiff < 5 * 60 * 1000
  })

  if (exactMatch) {
    return {
      isDuplicate: true,
      duplicateLoadId: exactMatch.id,
      duplicateTrackingCode: exactMatch.publicTrackingCode,
      similarity: 'exact',
      message: `An identical load request already exists (${exactMatch.publicTrackingCode}) with the same timing. This appears to be a duplicate.`,
    }
  }

  // Near match (within time window)
  const nearMatch = existingLoads[0]
  return {
    isDuplicate: true,
    duplicateLoadId: nearMatch.id,
    duplicateTrackingCode: nearMatch.publicTrackingCode,
    similarity: 'near',
    message: `A similar load request exists (${nearMatch.publicTrackingCode}) within ${timeWindowMinutes} minutes of this time window. This may be a duplicate.`,
  }
}

/**
 * Check if a load should be blocked due to duplicate detection
 */
export async function shouldBlockDuplicateLoad(
  data: LoadRequestData,
  allowOverride: boolean = false
): Promise<{
  shouldBlock: boolean
  result: DuplicateResult
  requiresOverride: boolean
}> {
  const result = await detectDuplicateLoad(data)

  if (!result.isDuplicate) {
    return {
      shouldBlock: false,
      result,
      requiresOverride: false,
    }
  }

  // Block exact duplicates unless override is provided
  if (result.similarity === 'exact' && !allowOverride) {
    return {
      shouldBlock: true,
      result,
      requiresOverride: true,
    }
  }

  // Warn about near duplicates but allow with override
  return {
    shouldBlock: false,
    result,
    requiresOverride: result.similarity === 'near',
  }
}

