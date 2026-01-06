import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/drivers/[id]/loads
 * Get all loads - all drivers see the same load board
 * Shows all active loads regardless of assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params // Driver ID not used - all drivers see all loads
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Optimized query - use select, limit results, pagination
    const [loads, total] = await Promise.all([
      prisma.loadRequest.findMany({
        where: {
          status: {
            notIn: ['CANCELLED', 'DELIVERED']
          }
        },
        select: {
          id: true,
          publicTrackingCode: true,
          status: true,
          serviceType: true,
          commodityDescription: true,
          temperatureRequirement: true,
          readyTime: true,
          deliveryDeadline: true,
          quoteAmount: true,
          createdAt: true,
          shipper: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
            }
          },
          pickupFacility: {
            select: {
              id: true,
              name: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              contactPhone: true,
            }
          },
          dropoffFacility: {
            select: {
              id: true,
              name: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              contactPhone: true,
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
          // Only get latest tracking event
          trackingEvents: {
            select: {
              code: true,
              label: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          // Only get document count, not full list
          _count: {
            select: {
              documents: true
            }
          }
        },
        orderBy: [
          { status: 'asc' }, // Active loads first
          { readyTime: 'asc' }, // Then by ready time
          { createdAt: 'desc' } // Most recent first
        ],
        skip,
        take: limit,
      }),
      prisma.loadRequest.count({
        where: {
          status: {
            notIn: ['CANCELLED', 'DELIVERED']
          }
        }
      })
    ])

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
    console.error('Error fetching driver loads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loads', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
