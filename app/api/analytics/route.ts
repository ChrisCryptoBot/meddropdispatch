// Analytics API Route
// GET: Get analytics data for admin dashboard

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/analytics
 * Get analytics data (daily, weekly, monthly stats)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'daily' // daily, weekly, monthly

    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Total loads
    const totalLoads = await prisma.loadRequest.count({
      where: {
        createdAt: { gte: startDate },
      },
    })

    // Loads by status
    const loadsByStatus = await prisma.loadRequest.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    })

    // Completed loads
    const completedLoads = await prisma.loadRequest.count({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['DELIVERED', 'COMPLETED'] },
      },
    })

    // Total revenue (sum of quoteAmount for completed loads)
    const revenueResult = await prisma.loadRequest.aggregate({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['DELIVERED', 'COMPLETED'] },
        quoteAmount: { not: null },
      },
      _sum: {
        quoteAmount: true,
      },
    })

    const totalRevenue = revenueResult._sum.quoteAmount || 0

    // Loads by service type
    const loadsByServiceType = await prisma.loadRequest.groupBy({
      by: ['serviceType'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    })

    // Top 5 shippers by volume
    const topShippers = await prisma.loadRequest.groupBy({
      by: ['shipperId'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
      orderBy: {
        _count: {
          shipperId: 'desc',
        },
      },
      take: 5,
    })

    // Get shipper details
    const topShippersWithDetails = await Promise.all(
      topShippers.map(async (item) => {
        const shipper = await prisma.shipper.findUnique({
          where: { id: item.shipperId },
          select: {
            id: true,
            companyName: true,
          },
        })
        return {
          shipperId: item.shipperId,
          companyName: shipper?.companyName || 'Unknown',
          count: item._count,
        }
      })
    )

    // Daily breakdown (last 7 days)
    const dailyBreakdown = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.setHours(0, 0, 0, 0))
      const dayEnd = new Date(date.setHours(23, 59, 59, 999))

      const count = await prisma.loadRequest.count({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      })

      dailyBreakdown.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      })
    }

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      stats: {
        totalLoads,
        completedLoads,
        totalRevenue,
        completionRate: totalLoads > 0 ? (completedLoads / totalLoads) * 100 : 0,
        averageRevenuePerLoad: completedLoads > 0 ? totalRevenue / completedLoads : 0,
      },
      loadsByStatus: loadsByStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
      loadsByServiceType: loadsByServiceType.map((item) => ({
        serviceType: item.serviceType,
        count: item._count,
      })),
      topShippers: topShippersWithDetails,
      dailyBreakdown,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

