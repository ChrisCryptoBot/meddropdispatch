import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/drivers/[id]/my-loads
 * Get all loads assigned to/accepted by a specific driver (including completed)
 * Shows driver's complete load history with documentation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: driverId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Build where clause
    const where: any = {
      driverId: driverId, // Only loads assigned to this driver
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      where.status = status
    }

    // Note: SQLite doesn't support case-insensitive mode, so we'll filter in the query
    // For now, we'll fetch all loads and filter client-side if search is provided
    // In production with PostgreSQL, use mode: 'insensitive'

    // Get all loads for this driver (including completed and cancelled)
    let loads = await prisma.loadRequest.findMany({
      where,
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            phone: true,
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
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            uploadedBy: true,
          }
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      }
    })

    // Client-side search filtering (since SQLite doesn't support case-insensitive)
    if (search) {
      const searchLower = search.toLowerCase()
      loads = loads.filter((load) => {
        return (
          load.publicTrackingCode.toLowerCase().includes(searchLower) ||
          load.commodityDescription.toLowerCase().includes(searchLower) ||
          load.pickupFacility.city.toLowerCase().includes(searchLower) ||
          load.pickupFacility.state.toLowerCase().includes(searchLower) ||
          load.dropoffFacility.city.toLowerCase().includes(searchLower) ||
          load.dropoffFacility.state.toLowerCase().includes(searchLower)
        )
      })
    }

    return NextResponse.json({ loads })
  } catch (error) {
    console.error('Error fetching driver my loads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loads', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

