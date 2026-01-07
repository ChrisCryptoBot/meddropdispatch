import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildLoadVisibilityWhere } from '@/lib/fleet-visibility'

/**
 * GET /api/drivers/[id]/my-loads
 * Get all loads assigned to/accepted by a specific driver (including completed)
 * Shows driver's complete load history with documentation
 * Fleet Protocol: OWNER/ADMIN see all fleet loads, DRIVER sees only own loads
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 per page
    const skip = (page - 1) * limit

    // Build where clause with fleet visibility scoping
    const baseWhere: any = {}
    if (status && status !== 'all') {
      baseWhere.status = status
    }
    
    const where = await buildLoadVisibilityWhere(driverId, baseWhere)

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
          take: 1, // Only get latest tracking event
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            uploadedBy: true,
          },
          take: 5, // Limit documents per load
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
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

    // Get total count (before pagination)
    const total = loads.length

    // Apply pagination after filtering
    const paginatedLoads = loads.slice(skip, skip + limit)

    return NextResponse.json({
      loads: paginatedLoads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    })
  } catch (error) {
    console.error('Error fetching driver my loads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch loads', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

