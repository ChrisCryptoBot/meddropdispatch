// Quote Requests API Route
// GET: List all quote-requested loads

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/load-requests/quote-requests
 * List all loads with QUOTE_REQUESTED status
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Fetch quote requests
    const quoteRequests = await prisma.loadRequest.findMany({
      where: {
        status: 'QUOTE_REQUESTED',
      },
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
            email: true,
            phone: true,
            contactName: true,
          },
        },
        pickupFacility: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            addressLine1: true,
          },
        },
        dropoffFacility: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            addressLine1: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: offset,
      take: limit,
    })

    // Get total count
    const totalCount = await prisma.loadRequest.count({
      where: {
        status: 'QUOTE_REQUESTED',
      },
    })

    // Transform data for response
    const transformedRequests = quoteRequests.map((request: any) => ({
      id: request.id,
      trackingCode: request.publicTrackingCode,
      shipper: {
        id: request.shipper.id,
        name: request.shipper.companyName,
        email: request.shipper.email,
        phone: request.shipper.phone,
        contactName: request.shipper.contactName,
      },
      pickup: {
        address: request.pickupFacility.addressLine1,
        city: request.pickupFacility.city,
        state: request.pickupFacility.state,
      },
      dropoff: {
        address: request.dropoffFacility.addressLine1,
        city: request.dropoffFacility.city,
        state: request.dropoffFacility.state,
      },
      distance: request.autoCalculatedDistance,
      estimatedTime: request.autoCalculatedTime,
      suggestedRate: request.suggestedRateMin && request.suggestedRateMax
        ? {
            min: request.suggestedRateMin,
            max: request.suggestedRateMax,
          }
        : null,
      emailSubject: request.emailSubject,
      createdAt: request.createdAt,
      serviceType: request.serviceType,
    }))

    return NextResponse.json({
      quoteRequests: transformedRequests,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  })(request)
}

