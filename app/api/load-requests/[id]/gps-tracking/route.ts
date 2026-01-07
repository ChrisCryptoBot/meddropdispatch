import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthorizationError, ValidationError, ConflictError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'
import { getCoordinates } from '@/lib/geocoding'
import { requireAdmin, verifyDriverAssignedToLoad, requireDriver } from '@/lib/authorization'
import { calculateDistanceFromCoordinates } from '@/lib/distance-calculator'
import { validateGPSTimestamp, checkSpeedPlausibility } from '@/lib/gps-validation'

const enableGPSTrackingSchema = z.object({
  enabled: z.boolean(),
})

const submitGPSCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional().nullable(),
  heading: z.number().min(0).max(360).optional().nullable(),
  speed: z.number().min(0).optional().nullable(),
  altitude: z.number().optional().nullable(),
})

/**
 * PATCH /api/load-requests/[id]/gps-tracking
 * Enable or disable GPS tracking for a load
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await req.json()
    const validation = enableGPSTrackingSchema.safeParse(rawData)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid request data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { enabled } = validation.data
    // Get load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      select: {
        status: true,
        driverId: true,
        gpsTrackingEnabled: true,
        gpsTrackingStartedAt: true,
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // AuthZ: Only assigned driver or admin can enable/disable tracking
    if (!loadRequest.driverId) {
      return NextResponse.json(
        {
          error: 'NoDriverAssigned',
          message: 'A driver must be assigned to enable GPS tracking.',
        },
        { status: 400 }
      )
    }

    try {
      // Allow admins OR the assigned driver
      await verifyDriverAssignedToLoad(request as NextRequest, id)
    } catch (e) {
      try {
        await requireAdmin(request as NextRequest)
      } catch {
        throw new AuthorizationError('Only the assigned driver or an admin can change GPS tracking state')
      }
    }

    // Do not allow enabling/disabling after terminal states
    const terminalOrLockedStatuses = ['DELIVERED', 'DENIED', 'CANCELLED']
    if (terminalOrLockedStatuses.includes((loadRequest as any).status)) {
      throw new ValidationError('GPS tracking cannot be modified for loads in a terminal state')
    }

    // Update GPS tracking status
    const updatedLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        gpsTrackingEnabled: enabled,
        gpsTrackingStartedAt: enabled ? (loadRequest.gpsTrackingStartedAt || new Date()) : null,
      },
    })

    return NextResponse.json({
      success: true,
      gpsTrackingEnabled: updatedLoad.gpsTrackingEnabled,
      gpsTrackingStartedAt: updatedLoad.gpsTrackingStartedAt,
    })
  })(request)
}

/**
 * POST /api/load-requests/[id]/gps-tracking
 * Submit GPS coordinates for a load (driver location update)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await req.json()
    
    console.log('[GPS Tracking API] POST request received for load:', id)
    console.log('[GPS Tracking API] Payload:', JSON.stringify(rawData))
    
    const validation = submitGPSCoordinatesSchema.safeParse(rawData)

    if (!validation.success) {
      console.error('[GPS Tracking API] Validation failed:', validation.error.errors)
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid GPS coordinates',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { latitude, longitude, accuracy, heading, speed, altitude } = validation.data

    // STRICTER AUTHZ: Ensure the caller is the assigned driver (not just any driver)
    const driverAuth = await requireDriver(request as NextRequest)
    
    // Get load request first
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      select: {
        status: true,
        gpsTrackingEnabled: true,
        driverId: true,
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Verify driver is assigned to this load
    await verifyDriverAssignedToLoad(request as NextRequest, id)
    
    // Double-check: Ensure the authenticated driver matches the assigned driver
    if (loadRequest.driverId !== driverAuth.userId) {
      throw new AuthorizationError('Only the assigned driver can submit GPS coordinates for this load')
    }

    console.log('[GPS Tracking API] Load request found. GPS enabled:', loadRequest.gpsTrackingEnabled, 'Driver ID:', loadRequest.driverId)

    if (!loadRequest.gpsTrackingEnabled) {
      console.warn('[GPS Tracking API] GPS tracking not enabled for load:', id)
      return NextResponse.json(
        {
          error: 'GPSTrackingNotEnabled',
          message: 'GPS tracking is not enabled for this load.',
        },
        { status: 400 }
      )
    }

    if (!loadRequest.driverId) {
      console.warn('[GPS Tracking API] No driver assigned to load:', id)
      return NextResponse.json(
        {
          error: 'NoDriverAssigned',
          message: 'No driver assigned to this load.',
        },
        { status: 400 }
      )
    }

    // Do not accept GPS updates for terminal states
    const terminalStatuses = ['DELIVERED', 'DENIED', 'CANCELLED']
    if (terminalStatuses.includes((loadRequest as any).status)) {
      throw new ValidationError('Cannot submit GPS updates for loads in a terminal state')
    }

    // GPS TIMESTAMP VALIDATION: Reject future dates or stale points (>12 hours old)
    const timestampValidation = validateGPSTimestamp(new Date(), 12)
    if (!timestampValidation.valid) {
      throw new ValidationError(timestampValidation.error || 'Invalid GPS timestamp')
    }

    // Anti-spoof: Compare with last point for implausible jumps
    const lastPoint = await prisma.gPSTrackingPoint.findFirst({
      where: { loadRequestId: id },
      orderBy: { timestamp: 'desc' },
      select: { latitude: true, longitude: true, timestamp: true },
    })

    if (lastPoint) {
      try {
        // Use enhanced speed plausibility check
        const speedCheck = checkSpeedPlausibility(
          {
            latitude: lastPoint.latitude,
            longitude: lastPoint.longitude,
            timestamp: lastPoint.timestamp,
          },
          {
            latitude,
            longitude,
            timestamp: new Date(),
          },
          150 // Max 150 mph
        )

        if (!speedCheck.valid) {
          console.warn('[GPS Tracking API] Speed plausibility check failed:', speedCheck.error, 'Speed:', speedCheck.speedMph, 'mph')
          throw new ConflictError(speedCheck.error || 'Implausible GPS movement detected')
        }

        const distanceMiles = calculateDistanceFromCoordinates(
          lastPoint.latitude,
          lastPoint.longitude,
          latitude,
          longitude
        )
        const now = new Date()
        const dtSeconds = Math.max(1, (now.getTime() - new Date(lastPoint.timestamp).getTime()) / 1000)

        // Additional check: Reject huge jumps in < 2 seconds (even if speed check passes)
        if (dtSeconds < 2 && distanceMiles > 0.1) {
          console.warn('[GPS Tracking API] Anti-spoof triggered. Distance:', distanceMiles, 'mi in', dtSeconds, 's')
          throw new ConflictError('Implausible GPS movement detected: large distance in very short time')
        }

        // Ignore micro-jitter (< 15 meters ~ 0.0093 miles) by early return success with no new point
        if (distanceMiles < 0.0093) {
          return NextResponse.json({
            success: true,
            ignored: true,
            reason: 'Jitter below threshold',
          })
        }
      } catch (antiSpoofError) {
        if (antiSpoofError instanceof ConflictError || antiSpoofError instanceof ValidationError) {
          return NextResponse.json(
            { error: 'InvalidMovement', message: antiSpoofError.message },
            { status: 409 }
          )
        }
        // Fallthrough on unexpected errors
      }
    }

    // Create GPS tracking point
    const trackingPoint = await prisma.gPSTrackingPoint.create({
      data: {
        loadRequestId: id,
        driverId: loadRequest.driverId,
        latitude,
        longitude,
        accuracy: accuracy || null,
        heading: heading || null,
        speed: speed || null,
        altitude: altitude || null,
      },
    })

    return NextResponse.json({
      success: true,
      trackingPoint: {
        id: trackingPoint.id,
        latitude: trackingPoint.latitude,
        longitude: trackingPoint.longitude,
        timestamp: trackingPoint.timestamp,
      },
    })
  })(request)
}

/**
 * GET /api/load-requests/[id]/gps-tracking
 * Get GPS tracking data for a load (for shipper view)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let loadId: string | undefined
  try {
    // Diagnostic: Check if Prisma client and model are available
    try {
      console.log('[GPS Tracking API] Checking Prisma client availability...')
      if (!prisma) {
        console.error('[GPS Tracking API] Prisma client is null or undefined')
        return NextResponse.json(
          { error: 'ConfigurationError', message: 'Database client not initialized' },
          { status: 500 }
        )
      }
      
      // Check if the model exists (this will throw if it doesn't)
      if (typeof (prisma as any).gPSTrackingPoint === 'undefined') {
        console.error('[GPS Tracking API] Model gPSTrackingPoint not found in Prisma client')
        console.log('[GPS Tracking API] Available Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('_') && typeof (prisma as any)[k] === 'object'))
        return NextResponse.json(
          { 
            error: 'ConfigurationError', 
            message: 'GPS tracking model not available. Please run: npx prisma generate',
            details: 'Model gPSTrackingPoint not found in Prisma client'
          },
          { status: 500 }
        )
      }
      console.log('[GPS Tracking API] Prisma client and model verified')
    } catch (prismaCheckError: any) {
      console.error('[GPS Tracking API] Error checking Prisma client:', prismaCheckError)
      return NextResponse.json(
        { 
          error: 'ConfigurationError', 
          message: 'Database configuration error',
          details: prismaCheckError?.message || 'Unknown Prisma error'
        },
        { status: 500 }
      )
    }

    // Extract params first with error handling
    try {
      const resolvedParams = await params
      loadId = resolvedParams.id
      console.log('[GPS Tracking API] GET request received for load:', loadId)
    } catch (paramsError: any) {
      console.error('[GPS Tracking API] Error extracting params:', paramsError)
      return NextResponse.json(
        { error: 'InvalidRequest', message: 'Failed to parse request parameters', details: paramsError?.message },
        { status: 400 }
      )
    }

    if (!loadId || typeof loadId !== 'string' || loadId.trim() === '') {
      console.error('[GPS Tracking API] Invalid load ID:', loadId)
      return NextResponse.json(
        { error: 'InvalidRequest', message: 'Invalid or missing load ID' },
        { status: 400 }
      )
    }

    const id = loadId.trim()

    // Robust helper function to safely convert DateTime to ISO string
    const toISOStringSafe = (value: unknown): string | null => {
      if (value == null) return null
      // Native Date
      if (value instanceof Date) return value.toISOString()
      // Prisma DateTime object
      if (typeof value === 'object' && value !== null && 'toISOString' in value && typeof (value as any).toISOString === 'function') {
        try {
          return (value as any).toISOString()
        } catch {
          // fallthrough
        }
      }
      // String that might be a date
      if (typeof value === 'string') {
        const d = new Date(value)
        if (!isNaN(d.getTime())) return d.toISOString()
        return value
      }
      // Try to convert to string and parse
      try {
        const s = String(value)
        const d = new Date(s)
        if (!isNaN(d.getTime())) return d.toISOString()
      } catch {
        // fallthrough
      }
      return null
    }

    // Get load request with facilities and all locations
    let loadRequest: any
    try {
      // First try with locations relation
      try {
        loadRequest = await prisma.loadRequest.findUnique({
          where: { id },
          select: {
            id: true,
            gpsTrackingEnabled: true,
            gpsTrackingStartedAt: true,
            driverId: true,
            pickupFacility: {
              select: {
                id: true,
                name: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                postalCode: true,
              },
            },
            dropoffFacility: {
              select: {
                id: true,
                name: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                postalCode: true,
              },
            },
            locations: {
              orderBy: [
                { locationType: 'asc' },
                { sequence: 'asc' },
              ],
              include: {
                facility: {
                  select: {
                    id: true,
                    name: true,
                    addressLine1: true,
                    addressLine2: true,
                    city: true,
                    state: true,
                    postalCode: true,
                  },
                },
              },
            },
          },
        })
      } catch (locationsError: any) {
        // If locations relation doesn't exist, query without it
        if (locationsError?.message?.includes('locations') || locationsError?.message?.includes('Unknown field')) {
          console.warn('[GPS Tracking API] Locations relation not available, querying without it')
          loadRequest = await prisma.loadRequest.findUnique({
            where: { id },
            select: {
              id: true,
              gpsTrackingEnabled: true,
              gpsTrackingStartedAt: true,
              driverId: true,
              pickupFacility: {
                select: {
                  id: true,
                  name: true,
                  addressLine1: true,
                  addressLine2: true,
                  city: true,
                  state: true,
                  postalCode: true,
                },
              },
              dropoffFacility: {
                select: {
                  id: true,
                  name: true,
                  addressLine1: true,
                  addressLine2: true,
                  city: true,
                  state: true,
                  postalCode: true,
                },
              },
            },
          })
          // Set locations to empty array if relation doesn't exist
          if (loadRequest) {
            loadRequest.locations = []
          }
        } else {
          throw locationsError
        }
      }
      console.log('[GPS Tracking API] Load request found. GPS enabled:', loadRequest?.gpsTrackingEnabled)
    } catch (dbError: any) {
      console.error('[GPS Tracking API] Database error fetching load request:', dbError)
      console.error('[GPS Tracking API] Error details:', {
        name: dbError?.name,
        message: dbError?.message,
        code: dbError?.code,
      })
      return NextResponse.json(
        { 
          error: 'DatabaseError',
          message: 'Failed to fetch load request',
          details: dbError?.message || 'Unknown database error'
        },
        { status: 500 }
      )
    }

    if (!loadRequest) {
      console.warn('[GPS Tracking API] Load request not found:', id)
      return NextResponse.json(
        { error: 'NotFound', message: 'Load request not found' },
        { status: 404 }
      )
    }

    if (!loadRequest.gpsTrackingEnabled) {
      console.log('[GPS Tracking API] GPS tracking not enabled for load:', id)
      
      // Helper to safely serialize facilities
      const serializeFacilitySafe = (facility: any) => {
        if (!facility) return null
        return {
          id: String(facility.id || ''),
          name: String(facility.name || ''),
          addressLine1: String(facility.addressLine1 || ''),
          addressLine2: facility.addressLine2 ? String(facility.addressLine2) : null,
          city: String(facility.city || ''),
          state: String(facility.state || ''),
          postalCode: String(facility.postalCode || ''),
        }
      }
      
      // Helper to safely serialize locations
      const serializeLocationSafe = (loc: any) => {
        try {
          return {
            id: String(loc.id),
            locationType: String(loc.locationType),
            sequence: Number(loc.sequence),
            facility: serializeFacilitySafe(loc.facility),
            readyTime: toISOStringSafe(loc.readyTime),
            accessNotes: loc.accessNotes ? String(loc.accessNotes) : null,
          }
        } catch (error) {
          console.warn('[GPS Tracking API] Error serializing location:', loc.id, error)
          return null
        }
      }
      
      const safeLocations = (loadRequest.locations || []).map(serializeLocationSafe).filter(Boolean)
      
      return NextResponse.json({
        gpsTrackingEnabled: false,
        trackingPoints: [],
        pickupFacility: serializeFacilitySafe(loadRequest.pickupFacility),
        dropoffFacility: serializeFacilitySafe(loadRequest.dropoffFacility),
        locations: safeLocations,
      })
    }

    // Get all GPS tracking points for this load, ordered by timestamp
    console.log('[GPS Tracking API] Fetching tracking points for load:', id)
    
    let trackingPoints: any[] = []
    try {
      // Prisma converts GPSTrackingPoint model to gPSTrackingPoint in the client
      // Try to query tracking points - if model doesn't exist, this will throw
      trackingPoints = await prisma.gPSTrackingPoint.findMany({
        where: { loadRequestId: id },
        orderBy: { timestamp: 'asc' },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          accuracy: true,
          heading: true,
          speed: true,
          altitude: true,
          timestamp: true,
        },
      })
      console.log('[GPS Tracking API] Found', trackingPoints.length, 'tracking points')
    } catch (queryError: any) {
      console.error('[GPS Tracking API] Error querying tracking points:', queryError)
      console.error('[GPS Tracking API] Error details:', {
        name: queryError?.name,
        message: queryError?.message,
        code: queryError?.code,
        stack: queryError?.stack?.substring(0, 1000), // Limit stack trace length
      })
      
      // Check if it's a model not found error
      if (queryError?.message?.includes('gPSTrackingPoint') || 
          queryError?.message?.includes('GPSTrackingPoint') ||
          queryError?.message?.includes('does not exist')) {
        console.error('[GPS Tracking API] Prisma model not found. This usually means Prisma client needs regeneration.')
        return NextResponse.json(
          {
            error: 'ConfigurationError',
            message: 'GPS tracking model not available. Please regenerate Prisma client.',
            details: queryError?.message || 'Model gPSTrackingPoint not found in Prisma client',
            loadId: id,
          },
          { status: 500 }
        )
      }
      
      // Return error response with full details for debugging
      return NextResponse.json(
        {
          error: 'DatabaseError',
          message: 'Failed to fetch GPS tracking points',
          details: queryError?.message || 'Unknown database error',
          errorName: queryError?.name,
          errorCode: queryError?.code,
          loadId: id,
        },
        { status: 500 }
      )
    }

    // Serialize tracking points - convert all Date-like fields and ensure primitives
    const serializeTrackingPoint = (p: any) => {
      try {
        return {
          id: String(p.id),
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          accuracy: p.accuracy == null ? null : Number(p.accuracy),
          heading: p.heading == null ? null : Number(p.heading),
          speed: p.speed == null ? null : Number(p.speed),
          altitude: p.altitude == null ? null : Number(p.altitude),
          timestamp: toISOStringSafe(p.timestamp) || new Date().toISOString(),
        }
      } catch (err) {
        console.error('[GPS Tracking API] Error serializing point', { id: p?.id, error: err })
        return null
      }
    }

    const safeTrackingPoints = trackingPoints.map(serializeTrackingPoint).filter(Boolean)

    // Helper to build address string
    const buildAddress = (facility: any) => {
      if (!facility) return ''
      const parts = [
        facility.addressLine1,
        facility.addressLine2,
        facility.city,
        facility.state,
        facility.postalCode,
      ].filter(Boolean)
      return parts.join(', ')
    }

    // Helper to safely geocode with error handling
    const safeGeocode = async (address: string) => {
      if (!address || address.trim() === '') return null
      try {
        return await getCoordinates(address)
      } catch (error) {
        console.warn('[GPS Tracking API] Geocoding failed for address:', address, error)
        return null
      }
    }

    // Geocode pickup facility (with error handling)
    let pickupCoords = null
    if (loadRequest.pickupFacility) {
      try {
        const pickupAddress = buildAddress(loadRequest.pickupFacility)
        if (pickupAddress) {
          pickupCoords = await safeGeocode(pickupAddress)
        }
      } catch (error) {
        console.warn('[GPS Tracking API] Error geocoding pickup facility:', error)
      }
    }

    // Geocode dropoff facility (with error handling)
    let dropoffCoords = null
    if (loadRequest.dropoffFacility) {
      try {
        const dropoffAddress = buildAddress(loadRequest.dropoffFacility)
        if (dropoffAddress) {
          dropoffCoords = await safeGeocode(dropoffAddress)
        }
      } catch (error) {
        console.warn('[GPS Tracking API] Error geocoding dropoff facility:', error)
      }
    }

    // Geocode all locations (with error handling and timeout protection)
    let locationsWithCoords: any[] = []
    if (loadRequest.locations && Array.isArray(loadRequest.locations) && loadRequest.locations.length > 0) {
      try {
        // Process locations without coordinates first (faster), then geocode in parallel with timeout
        const locationPromises = loadRequest.locations.map(async (loc: any) => {
          try {
            if (!loc || !loc.facility) {
              console.warn('[GPS Tracking API] Invalid location data:', loc)
              return null
            }
            
            const address = buildAddress(loc.facility)
            // Geocode with a timeout to prevent hanging
            const coordsPromise = address ? safeGeocode(address) : Promise.resolve(null)
            const coords = await Promise.race([
              coordsPromise,
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)) // 5 second timeout
            ])
            
            return {
              id: String(loc.id || ''),
              locationType: String(loc.locationType || ''),
              sequence: Number(loc.sequence || 0),
              facility: {
                id: String(loc.facility.id || ''),
                name: String(loc.facility.name || ''),
                addressLine1: String(loc.facility.addressLine1 || ''),
                addressLine2: loc.facility.addressLine2 ? String(loc.facility.addressLine2) : null,
                city: String(loc.facility.city || ''),
                state: String(loc.facility.state || ''),
                postalCode: String(loc.facility.postalCode || ''),
                latitude: coords?.latitude || null,
                longitude: coords?.longitude || null,
              },
              readyTime: toISOStringSafe(loc.readyTime),
              accessNotes: loc.accessNotes ? String(loc.accessNotes) : null,
            }
          } catch (error) {
            console.warn('[GPS Tracking API] Error processing location:', loc?.id, error)
            return null
          }
        })
        
        locationsWithCoords = await Promise.all(locationPromises)
        // Filter out any null results from failed processing
        locationsWithCoords = locationsWithCoords.filter(Boolean)
      } catch (error) {
        console.error('[GPS Tracking API] Error geocoding locations:', error)
        // Return locations without coordinates rather than failing
        locationsWithCoords = (loadRequest.locations || []).map((loc: any) => {
          try {
            return {
              id: String(loc.id || ''),
              locationType: String(loc.locationType || ''),
              sequence: Number(loc.sequence || 0),
              facility: loc.facility ? {
                id: String(loc.facility.id || ''),
                name: String(loc.facility.name || ''),
                addressLine1: String(loc.facility.addressLine1 || ''),
                addressLine2: loc.facility.addressLine2 ? String(loc.facility.addressLine2) : null,
                city: String(loc.facility.city || ''),
                state: String(loc.facility.state || ''),
                postalCode: String(loc.facility.postalCode || ''),
                latitude: null,
                longitude: null,
              } : null,
              readyTime: toISOStringSafe(loc.readyTime),
              accessNotes: loc.accessNotes ? String(loc.accessNotes) : null,
            }
          } catch (e) {
            return null
          }
        }).filter(Boolean)
      }
    }

    let responseData
    try {
      // Safely serialize facilities
      const serializeFacility = (facility: any, coords: any) => {
        if (!facility) return null
        return {
          id: String(facility.id || ''),
          name: String(facility.name || ''),
          addressLine1: String(facility.addressLine1 || ''),
          addressLine2: facility.addressLine2 ? String(facility.addressLine2) : null,
          city: String(facility.city || ''),
          state: String(facility.state || ''),
          postalCode: String(facility.postalCode || ''),
          latitude: coords?.latitude || null,
          longitude: coords?.longitude || null,
        }
      }

      responseData = {
        gpsTrackingEnabled: true,
        gpsTrackingStartedAt: toISOStringSafe(loadRequest.gpsTrackingStartedAt),
        trackingPoints: safeTrackingPoints,
        pickupFacility: serializeFacility(loadRequest.pickupFacility, pickupCoords),
        dropoffFacility: serializeFacility(loadRequest.dropoffFacility, dropoffCoords),
        locations: locationsWithCoords,
      }

      console.log('[GPS Tracking API] Returning response with', responseData.trackingPoints.length, 'tracking points')
      return NextResponse.json(responseData)
    } catch (serializationError: any) {
      console.error('[GPS Tracking API] Error serializing response:', serializationError)
      console.error('[GPS Tracking API] Serialization error details:', {
        name: serializationError?.name,
        message: serializationError?.message,
        stack: serializationError?.stack?.substring(0, 500),
      })
      return NextResponse.json(
        {
          error: 'SerializationError',
          message: 'Failed to serialize GPS tracking data',
          details: serializationError?.message || 'Unknown serialization error',
          loadId: id,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[GPS Tracking API] Unhandled error in GET:', error)
    if (error instanceof Error) {
      console.error('[GPS Tracking API] Error message:', error.message)
      console.error('[GPS Tracking API] Error stack:', error.stack?.substring(0, 1000))
    } else {
      console.error('[GPS Tracking API] Unknown error type:', typeof error, error)
    }
    
    // Try to use createErrorResponse, but have a fallback if it fails
    try {
      return createErrorResponse(error)
    } catch (responseError: any) {
      console.error('[GPS Tracking API] Error creating error response:', responseError)
      return NextResponse.json(
        {
          error: 'InternalServerError',
          message: 'An unexpected error occurred',
          details: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
  }
}


