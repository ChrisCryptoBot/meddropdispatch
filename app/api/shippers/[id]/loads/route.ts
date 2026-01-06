import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyShipperAccess } from '@/lib/authorization'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/shippers/[id]/loads
 * Get all loads for a specific shipper
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit public list access
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'RateLimitError', message: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
    }

    const { id } = await params

    // Ownership guard: authenticated shipper must match requested id
    await verifyShipperAccess(request, id)

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Log for debugging
    console.log(`[Fetch Shipper Loads] Requesting loads for shipper: ${id}, page: ${page}, limit: ${limit}`)

    // Optimized query - use select instead of include, limit results
    const [loads, total] = await Promise.all([
      prisma.loadRequest.findMany({
        where: {
          shipperId: id,
        },
        select: {
          id: true,
          publicTrackingCode: true,
          status: true,
          readyTime: true,
          deliveryDeadline: true,
          quoteAmount: true,
          createdAt: true,
          gpsTrackingEnabled: true,
          pickupFacility: {
            select: {
              id: true,
              name: true,
              addressLine1: true,
              city: true,
              state: true,
            }
          },
          dropoffFacility: {
            select: {
              id: true,
              name: true,
              addressLine1: true,
              city: true,
              state: true,
            }
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              vehicleType: true,
            }
          },
          // Only get latest tracking event, not all
          trackingEvents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              code: true,
              label: true,
              createdAt: true,
            }
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.loadRequest.count({
        where: {
          shipperId: id,
        },
      })
    ])

    // Ensure all loads are returned, including REQUESTED status loads
    // REQUESTED loads should show if they've been reviewed/accepted by a driver
    console.log(`[Fetch Shipper Loads] Found ${loads.length} loads for shipper ${id} (page ${page} of ${Math.ceil(total / limit)}). Statuses: ${loads.map(l => l.status).join(', ')}`)

    return NextResponse.json({ 
      loads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    }, {
      headers: {
        'Cache-Control': 'private, s-maxage=10, stale-while-revalidate=30',
      }
    })

  } catch (error) {
    console.error('Error fetching shipper loads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loads', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
