import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { requireAuth } from '@/lib/authorization'

/**
 * GET /api/drivers/[id]/earnings
 * Get earnings summary for a driver (owner-operator)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    // Verify authentication
    const auth = await requireAuth(request)
    if (auth.userType !== 'driver' || auth.userId !== id) {
      throw new AuthorizationError('Unauthorized - you can only view your own earnings')
    }

    // Get driver
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true, isAdmin: true }
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Calculate date ranges
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get visibility scope (fleet-aware)
    const { getDriverVisibilityScope } = await import('@/lib/fleet-visibility')
    const visibleDriverIds = await getDriverVisibilityScope(id)

    // Get completed loads (for visible drivers - fleet-aware)
    const completedLoads = await prisma.loadRequest.findMany({
      where: {
        driverId: { in: visibleDriverIds },
        status: {
          in: ['DELIVERED', 'COMPLETED']
        }
      },
      select: {
        id: true,
        quoteAmount: true,
        driverQuoteAmount: true,
        actualDeliveryTime: true,
        shipperPaymentStatus: true,
        shipperPaidAt: true,
        driverId: true,
      }
    })

    // Calculate weekly earnings
    const weeklyLoads = completedLoads.filter(load => {
      if (!load.actualDeliveryTime) return false
      const deliveryDate = new Date(load.actualDeliveryTime)
      return deliveryDate >= weekStart
    })

    const weeklyTotal = weeklyLoads.reduce((sum, load) => {
      return sum + (load.driverQuoteAmount || load.quoteAmount || 0)
    }, 0)

    // Calculate monthly earnings
    const monthlyLoads = completedLoads.filter(load => {
      if (!load.actualDeliveryTime) return false
      const deliveryDate = new Date(load.actualDeliveryTime)
      return deliveryDate >= monthStart
    })

    const monthlyTotal = monthlyLoads.reduce((sum, load) => {
      return sum + (load.driverQuoteAmount || load.quoteAmount || 0)
    }, 0)

    // Calculate pending and paid
    const pending = completedLoads
      .filter(load => load.shipperPaymentStatus !== 'PAID')
      .reduce((sum, load) => sum + (load.driverQuoteAmount || load.quoteAmount || 0), 0)

    const paid = completedLoads
      .filter(load => load.shipperPaymentStatus === 'PAID')
      .reduce((sum, load) => sum + (load.driverQuoteAmount || load.quoteAmount || 0), 0)

    return NextResponse.json({
      weekly: {
        total: weeklyTotal,
        loads: weeklyLoads.length,
        average: weeklyLoads.length > 0 ? weeklyTotal / weeklyLoads.length : 0
      },
      monthly: {
        total: monthlyTotal,
        loads: monthlyLoads.length,
        average: monthlyLoads.length > 0 ? monthlyTotal / monthlyLoads.length : 0
      },
      pending,
      paid
    })
  })(request)
}

