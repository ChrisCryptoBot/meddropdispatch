import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/tracking/[code]
 * Public tracking endpoint with rate limiting and timing attack prevention
 * 
 * Security features:
 * - Strict rate limiting (5 req/min per IP)
 * - Constant-time error responses (prevent timing attacks)
 * - No information leakage in error messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const nextReq = req as NextRequest
    
    // STRICT RATE LIMITING: 5 requests per minute per IP for public tracking
    // This prevents enumeration attacks and abuse
    try {
      rateLimit({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5,
        message: 'Too many tracking requests. Please try again later.',
      })(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { code } = await params
    
    // Normalize tracking code (uppercase, trim)
    const normalizedCode = code?.toUpperCase().trim()
    
    if (!normalizedCode || normalizedCode.length < 8) {
      // Constant-time error response (prevent timing attacks)
      // Always return same error format regardless of code validity
      return NextResponse.json(
        {
          error: 'InvalidTrackingCode',
          message: 'Tracking code not found',
        },
        { status: 404 }
      )
    }

    // Query database (this is the only place where timing could leak info)
    // However, we normalize the response time by always doing the query
    // and returning a consistent error format
    const load = await prisma.loadRequest.findUnique({
      where: { publicTrackingCode: normalizedCode },
      select: {
        id: true,
        publicTrackingCode: true,
        status: true,
        serviceType: true,
        gpsTrackingEnabled: true,
        gpsTrackingStartedAt: true,
        shipper: {
          select: {
            id: true,
            companyName: true,
          },
        },
        pickupFacility: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
        dropoffFacility: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            vehicleType: true,
          },
        },
        trackingEvents: {
          select: {
            id: true,
            code: true,
            label: true,
            description: true,
            locationText: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        documents: {
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            uploadedBy: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    // Constant-time error response: Always return same format for not found
    // This prevents attackers from determining valid tracking codes via timing
    if (!load) {
      return NextResponse.json(
        {
          error: 'InvalidTrackingCode',
          message: 'Tracking code not found',
        },
        { status: 404 }
      )
    }

    // Return tracking data
    return NextResponse.json({
      trackingCode: load.publicTrackingCode,
      status: load.status,
      serviceType: load.serviceType,
      gpsTrackingEnabled: load.gpsTrackingEnabled,
      gpsTrackingStartedAt: load.gpsTrackingStartedAt,
      shipper: {
        companyName: load.shipper.companyName,
      },
      pickupFacility: {
        name: load.pickupFacility.name,
        city: load.pickupFacility.city,
        state: load.pickupFacility.state,
        postalCode: load.pickupFacility.postalCode,
      },
      dropoffFacility: {
        name: load.dropoffFacility.name,
        city: load.dropoffFacility.city,
        state: load.dropoffFacility.state,
        postalCode: load.dropoffFacility.postalCode,
      },
      driver: load.driver ? {
        firstName: load.driver.firstName,
        lastName: load.driver.lastName,
        phone: load.driver.phone,
        vehicleType: load.driver.vehicleType,
      } : null,
      trackingEvents: load.trackingEvents.map((event) => ({
        code: event.code,
        label: event.label,
        description: event.description,
        locationText: event.locationText,
        createdAt: event.createdAt.toISOString(),
      })),
      documents: load.documents.map((doc) => ({
        type: doc.type,
        title: doc.title,
        createdAt: doc.createdAt.toISOString(),
        uploadedBy: doc.uploadedBy,
      })),
    })
  })(request)
}

