import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers/[id]/shippers
 * Get all shippers that the driver has worked with, with statistics
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

    const { id: driverId } = await params

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    // Get ALL shippers in the system (for follow-up lists)
    // This ensures every shipper from every job is stored for follow-up
    // Exclude soft-deleted shippers (deletedAt is not null)
    const allShippers = await prisma.shipper.findMany({
      where: {
        deletedAt: null, // Only show non-deleted shippers
      },
      include: {
        loadRequests: {
          where: {
            driverId: driverId, // Only count loads for this driver
          },
          select: {
            id: true,
            status: true,
            quoteAmount: true,
            createdAt: true,
            actualDeliveryTime: true,
            publicTrackingCode: true,
          },
        },
      },
      orderBy: {
        companyName: 'asc',
      },
    })

    // Calculate statistics for each shipper
    const shippersWithStats = allShippers.map((shipper) => {
      const loads = shipper.loadRequests
      const completedLoads = loads.filter((load) => 
        load.status === 'DELIVERED'
      )
      const totalRevenue = completedLoads.reduce(
        (sum, load) => sum + (load.quoteAmount || 0),
        0
      )
      const lastLoadDate = loads.length > 0
        ? loads.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0].createdAt
        : null

      return {
        id: shipper.id,
        companyName: shipper.companyName,
        clientType: shipper.clientType,
        contactName: shipper.contactName,
        phone: shipper.phone,
        email: shipper.email,
        isActive: shipper.isActive,
        createdAt: shipper.createdAt.toISOString(),
        stats: {
          totalLoads: loads.length,
          completedLoads: completedLoads.length,
          pendingLoads: loads.filter((load) => 
            !['DELIVERED', 'CANCELLED'].includes(load.status)
          ).length,
          totalRevenue: totalRevenue,
          averageRevenuePerLoad: completedLoads.length > 0
            ? totalRevenue / completedLoads.length
            : 0,
          lastLoadDate: lastLoadDate ? lastLoadDate.toISOString() : null,
        },
      }
    })

    return NextResponse.json({ shippers: shippersWithStats })
  })(request)
}

