// Admin Dashboard Stats API Route
// GET: Get comprehensive statistics for admin dashboard

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/admin/stats
 * Get comprehensive dashboard statistics for admin
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const nextReq = req as NextRequest
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    // Get today's date range (start and end of today)
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    // Get yesterday for comparison
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    const endOfYesterday = new Date(endOfToday)
    endOfYesterday.setDate(endOfYesterday.getDate() - 1)

    // Active statuses (loads that are currently in progress)
    const activeStatuses: string[] = [
      'REQUESTED',
      'QUOTE_REQUESTED',
      'SCHEDULED',
      'EN_ROUTE',
      'PICKED_UP',
      'IN_TRANSIT',
    ]

    // Completed statuses
    const completedStatuses: string[] = ['DELIVERED']

    // Run all queries in parallel for better performance
    const [
      todayLoadsCount,
      yesterdayLoadsCount,
      activeLoadsCount,
      pendingQuotesCount,
      completedTodayCount,
      completedYesterdayCount,
      totalRevenueToday,
      totalRevenueYesterday,
      recentQuoteRequests,
    ] = await Promise.all([
      // Today's loads (created today)
      prisma.loadRequest.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),

      // Yesterday's loads (for comparison)
      prisma.loadRequest.count({
        where: {
          createdAt: {
            gte: startOfYesterday,
            lte: endOfYesterday,
          },
        },
      }),

      // Active loads (currently in progress)
      prisma.loadRequest.count({
        where: {
          status: {
            in: activeStatuses,
          },
        },
      }),

      // Pending quotes (QUOTE_REQUESTED status)
      prisma.loadRequest.count({
        where: {
          status: 'QUOTE_REQUESTED',
        },
      }),

      // Completed today (DELIVERED, completed today)
      prisma.loadRequest.count({
        where: {
          status: {
            in: completedStatuses,
          },
          OR: [
            {
              // Check if there's a tracking event for DELIVERED today
              trackingEvents: {
                some: {
                  code: {
                    in: ['DELIVERED'],
                  },
                  createdAt: {
                    gte: startOfToday,
                    lte: endOfToday,
                  },
                },
              },
            },
            // Fallback: if no tracking event, check updatedAt
            {
              updatedAt: {
                gte: startOfToday,
                lte: endOfToday,
              },
            },
          ],
        },
      }),

      // Completed yesterday (for comparison)
      prisma.loadRequest.count({
        where: {
          status: {
            in: completedStatuses,
          },
          OR: [
            {
              trackingEvents: {
                some: {
                  code: {
                    in: ['DELIVERED'],
                  },
                  createdAt: {
                    gte: startOfYesterday,
                    lte: endOfYesterday,
                  },
                },
              },
            },
            {
              updatedAt: {
                gte: startOfYesterday,
                lte: endOfYesterday,
              },
            },
          ],
        },
      }),

      // Total revenue today (sum of quoteAmount for completed loads today)
      prisma.loadRequest.aggregate({
        where: {
          status: {
            in: completedStatuses,
          },
          OR: [
            {
              trackingEvents: {
                some: {
                  code: {
                    in: ['DELIVERED'],
                  },
                  createdAt: {
                    gte: startOfToday,
                    lte: endOfToday,
                  },
                },
              },
            },
            {
              updatedAt: {
                gte: startOfToday,
                lte: endOfToday,
              },
            },
          ],
          quoteAmount: {
            not: null,
          },
        },
        _sum: {
          quoteAmount: true,
        },
      }),

      // Total revenue yesterday (for comparison)
      prisma.loadRequest.aggregate({
        where: {
          status: {
            in: completedStatuses,
          },
          OR: [
            {
              trackingEvents: {
                some: {
                  code: {
                    in: ['DELIVERED'],
                  },
                  createdAt: {
                    gte: startOfYesterday,
                    lte: endOfYesterday,
                  },
                },
              },
            },
            {
              updatedAt: {
                gte: startOfYesterday,
                lte: endOfYesterday,
              },
            },
          ],
          quoteAmount: {
            not: null,
          },
        },
        _sum: {
          quoteAmount: true,
        },
      }),

      // Recent quote requests (last 5, for dashboard widgets)
      prisma.loadRequest.findMany({
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
        take: 5,
      }),
    ])

    // Calculate revenue
    const revenueToday = totalRevenueToday._sum.quoteAmount || 0
    const revenueYesterday = totalRevenueYesterday._sum.quoteAmount || 0
    const revenueChange = revenueYesterday > 0 
      ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 
      : revenueToday > 0 ? 100 : 0

    // Calculate percentage changes
    const todayLoadsChange = yesterdayLoadsCount > 0
      ? ((todayLoadsCount - yesterdayLoadsCount) / yesterdayLoadsCount) * 100
      : todayLoadsCount > 0 ? 100 : 0

    const completedChange = completedYesterdayCount > 0
      ? ((completedTodayCount - completedYesterdayCount) / completedYesterdayCount) * 100
      : completedTodayCount > 0 ? 100 : 0

    // Get status breakdown for today's loads
    const statusBreakdown = await prisma.loadRequest.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      _count: {
        id: true,
      },
    })

    // Format status breakdown
    const statusBreakdownMap = statusBreakdown.reduce((acc, item) => {
      acc[item.status] = item._count.id
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      // Main stats
      todayLoads: todayLoadsCount,
      todayLoadsChange: Math.round(todayLoadsChange * 10) / 10, // Round to 1 decimal
      
      activeLoads: activeLoadsCount,
      
      pendingQuotes: pendingQuotesCount,
      
      completedToday: completedTodayCount,
      completedChange: Math.round(completedChange * 10) / 10, // Round to 1 decimal
      
      // Revenue stats
      revenueToday: revenueToday,
      revenueYesterday: revenueYesterday,
      revenueChange: Math.round(revenueChange * 10) / 10, // Round to 1 decimal
      
      // Status breakdown for today
      statusBreakdown: statusBreakdownMap,
      
      // Recent quote requests (for dashboard widgets)
      recentQuoteRequests: recentQuoteRequests.map((request) => ({
        id: request.id,
        trackingCode: request.publicTrackingCode,
        shipper: {
          id: request.shipper.id,
          companyName: request.shipper.companyName,
          email: request.shipper.email,
          phone: request.shipper.phone,
        },
        route: `${request.pickupFacility.city}, ${request.pickupFacility.state} → ${request.dropoffFacility.city}, ${request.dropoffFacility.state}`,
        distance: request.autoCalculatedDistance,
        suggestedRate: request.suggestedRateMin && request.suggestedRateMax
          ? {
              min: request.suggestedRateMin,
              max: request.suggestedRateMax,
            }
          : null,
        createdAt: request.createdAt.toISOString(),
      })),
      
      // Timestamp
      generatedAt: new Date().toISOString(),
    })
  })(request)
}

