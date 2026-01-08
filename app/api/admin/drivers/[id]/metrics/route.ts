import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyAdminRole } from '@/lib/auth-admin'

/**
 * GET /api/admin/drivers/[id]/metrics
 * Get driver performance metrics, load history, earnings, and shift history
 * Requires admin authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const nextReq = req as NextRequest
    
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const isAdmin = await verifyAdminRole(nextReq)
    if (!isAdmin) {
      const adminId = nextReq.headers.get('x-admin-id')
      const adminRole = nextReq.headers.get('x-admin-role')
      
      if (!adminId || (adminRole !== 'ADMIN' && adminRole !== 'DISPATCHER')) {
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 401 }
        )
      }
    }

    const { id: driverId } = await params

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, status: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Get load history
    const loads = await prisma.loadRequest.findMany({
      where: { driverId },
      select: {
        id: true,
        publicTrackingCode: true,
        status: true,
        quoteAmount: true,
        createdAt: true,
        actualPickupTime: true,
        actualDeliveryTime: true,
        deliveryDeadline: true,
        pickupFacility: {
          select: {
            name: true,
            city: true,
            state: true,
          },
        },
        dropoffFacility: {
          select: {
            name: true,
            city: true,
            state: true,
          },
        },
        shipper: {
          select: {
            companyName: true,
          },
        },
        driverRating: {
          select: {
            rating: true,
            feedback: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Get shift history
    const shifts = await prisma.driverShift.findMany({
      where: { driverId },
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
        totalHours: true,
      },
      orderBy: { clockIn: 'desc' },
      take: 50,
    })

    // Get driver payments
    const payments = await prisma.driverPayment.findMany({
      where: { driverId },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        paymentMethod: true,
        status: true,
        loadRequest: {
          select: {
            publicTrackingCode: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: 50,
    })

    // Calculate performance metrics
    const completedLoads = loads.filter(l => l.status === 'DELIVERED')
    const totalEarnings = completedLoads.reduce((sum, l) => sum + (l.quoteAmount || 0), 0)
    const totalPaid = payments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0)
    const pendingPayments = payments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0)

    // On-time delivery rate
    const onTimeDeliveries = completedLoads.filter(l => {
      if (!l.actualDeliveryTime || !l.deliveryDeadline) return false
      return new Date(l.actualDeliveryTime) <= new Date(l.deliveryDeadline)
    }).length
    const onTimeRate = completedLoads.length > 0 ? (onTimeDeliveries / completedLoads.length) * 100 : 0

    // Average rating
    const ratings = loads.filter(l => l.driverRating).map(l => l.driverRating!.rating)
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
      : 0

    // Total shift hours
    const totalShiftHours = shifts
      .filter(s => s.totalHours !== null)
      .reduce((sum, s) => sum + (s.totalHours || 0), 0)

    // Current active shift
    const activeShift = shifts.find(s => s.clockOut === null)

    // This month's stats
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthLoads = completedLoads.filter(l => new Date(l.createdAt) >= startOfMonth)
    const thisMonthEarnings = thisMonthLoads.reduce((sum, l) => sum + (l.quoteAmount || 0), 0)

    return NextResponse.json({
      driver: {
        id: driver.id,
        status: driver.status,
      },
      metrics: {
        totalLoads: loads.length,
        completedLoads: completedLoads.length,
        activeLoads: loads.filter(l => ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(l.status)).length,
        totalEarnings,
        totalPaid,
        pendingPayments,
        thisMonthEarnings,
        onTimeRate: Math.round(onTimeRate),
        averageRating: averageRating > 0 ? Math.round(averageRating * 10) / 10 : 0,
        totalRatings: ratings.length,
        totalShiftHours: Math.round(totalShiftHours * 10) / 10,
        activeShift: activeShift ? {
          clockIn: activeShift.clockIn,
          currentHours: activeShift.totalHours || (
            (new Date().getTime() - new Date(activeShift.clockIn).getTime()) / (1000 * 60 * 60)
          ),
        } : null,
      },
      loads,
      shifts,
      payments,
    })
  })(request)
}

