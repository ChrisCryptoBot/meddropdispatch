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

    // Return all active loads (excluding cancelled and completed)
    const loads = await prisma.loadRequest.findMany({
      where: {
        status: {
          notIn: ['CANCELLED', 'COMPLETED']
        }
      },
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
          }
        },
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
          select: {
            id: true,
            code: true,
            label: true,
            createdAt: true,
            locationText: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        documents: {
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            uploadedBy: true,
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: [
        { status: 'asc' }, // Active loads first
        { readyTime: 'asc' }, // Then by ready time
        { createdAt: 'desc' } // Most recent first
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
