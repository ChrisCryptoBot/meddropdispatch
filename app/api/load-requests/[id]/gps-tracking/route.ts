import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const enableGPSTrackingSchema = z.object({
  enabled: z.boolean(),
})

const submitGPSCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  altitude: z.number().optional(),
})

/**
 * PATCH /api/load-requests/[id]/gps-tracking
 * Enable or disable GPS tracking for a load
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(req)
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
      include: {
        driver: {
          select: { id: true },
        },
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Only the assigned driver can enable/disable GPS tracking
    // For now, we'll allow any authenticated user (can add driver check later)
    if (!loadRequest.driverId) {
      return NextResponse.json(
        {
          error: 'NoDriverAssigned',
          message: 'A driver must be assigned to enable GPS tracking.',
        },
        { status: 400 }
      )
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
  return withErrorHandling(async (req: NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await req.json()
    const validation = submitGPSCoordinatesSchema.safeParse(rawData)

    if (!validation.success) {
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

    // Get load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        driver: {
          select: { id: true },
        },
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    if (!loadRequest.gpsTrackingEnabled) {
      return NextResponse.json(
        {
          error: 'GPSTrackingNotEnabled',
          message: 'GPS tracking is not enabled for this load.',
        },
        { status: 400 }
      )
    }

    if (!loadRequest.driverId) {
      return NextResponse.json(
        {
          error: 'NoDriverAssigned',
          message: 'No driver assigned to this load.',
        },
        { status: 400 }
      )
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
  return withErrorHandling(async (req: NextRequest) => {
    const { id } = await params

    // Get load request
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      select: {
        id: true,
        gpsTrackingEnabled: true,
        gpsTrackingStartedAt: true,
        driverId: true,
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    if (!loadRequest.gpsTrackingEnabled) {
      return NextResponse.json({
        gpsTrackingEnabled: false,
        trackingPoints: [],
      })
    }

    // Get all GPS tracking points for this load, ordered by timestamp
    const trackingPoints = await prisma.gPSTrackingPoint.findMany({
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

    return NextResponse.json({
      gpsTrackingEnabled: true,
      gpsTrackingStartedAt: loadRequest.gpsTrackingStartedAt,
      trackingPoints,
    })
  })(request)
}


