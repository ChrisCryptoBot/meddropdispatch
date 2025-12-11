// Notifications API Route
// GET: Fetch notifications for admin dashboard

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/notifications
 * Get count and list of quote requests for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const since = searchParams.get('since') // ISO date string

    // Build where clause
    const whereClause: any = {
      status: 'QUOTE_REQUESTED',
    }

    if (since) {
      whereClause.createdAt = {
        gte: new Date(since),
      }
    }

    // Get count of all quote requests
    const totalCount = await prisma.loadRequest.count({
      where: {
        status: 'QUOTE_REQUESTED',
      },
    })

    // Get recent quote requests
    const recentQuoteRequests = await prisma.loadRequest.findMany({
      where: whereClause,
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
            email: true,
            phone: true,
          },
        },
        pickupFacility: {
          select: {
            city: true,
            state: true,
          },
        },
        dropoffFacility: {
          select: {
            city: true,
            state: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    // Transform for notification display
    const notifications = recentQuoteRequests.map((request) => ({
      id: request.id,
      type: 'QUOTE_REQUEST',
      trackingCode: request.publicTrackingCode,
      shipperName: request.shipper.companyName,
      shipperEmail: request.shipper.email,
      shipperPhone: request.shipper.phone,
      route: `${request.pickupFacility.city}, ${request.pickupFacility.state} → ${request.dropoffFacility.city}, ${request.dropoffFacility.state}`,
      distance: request.autoCalculatedDistance,
      suggestedRate: request.suggestedRateMin && request.suggestedRateMax
        ? {
            min: request.suggestedRateMin,
            max: request.suggestedRateMax,
          }
        : null,
      createdAt: request.createdAt,
      isNew: since ? new Date(request.createdAt) > new Date(since) : false,
    }))

    return NextResponse.json({
      totalCount,
      newCount: since ? notifications.filter(n => n.isNew).length : totalCount,
      notifications,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

