import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/drivers/[id]/loads
 * Get all loads assigned to a specific driver
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const loads = await prisma.loadRequest.findMany({
      where: {
        driverId: id,
        status: {
          in: ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']
        }
      },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
        trackingEvents: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        documents: true
      },
      orderBy: [
        { status: 'asc' }, // Active loads first
        { readyTime: 'asc' } // Then by ready time
      ]
    })

    return NextResponse.json({ loads })

  } catch (error) {
    console.error('Error fetching driver loads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loads', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
