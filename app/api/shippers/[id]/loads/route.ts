import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/shippers/[id]/loads
 * Get all loads for a specific shipper
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Log for debugging
    console.log(`[Fetch Shipper Loads] Requesting loads for shipper: ${id}`)

    const loads = await prisma.loadRequest.findMany({
      where: {
        shipperId: id,
      },
      include: {
        pickupFacility: true,
        dropoffFacility: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            vehicleType: true,
          }
        },
        trackingEvents: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Ensure all loads are returned, including REQUESTED status loads
    // REQUESTED loads should show if they've been reviewed/accepted by a driver
    console.log(`[Fetch Shipper Loads] Found ${loads.length} loads for shipper ${id}. Statuses: ${loads.map(l => l.status).join(', ')}`)

    return NextResponse.json({ loads })

  } catch (error) {
    console.error('Error fetching shipper loads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loads', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
