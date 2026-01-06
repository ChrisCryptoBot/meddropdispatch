import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyAdminRole } from '@/lib/auth-admin'

/**
 * GET /api/admin/shippers/brokerage
 * Get all brokerage tier shippers with their assigned dispatchers
 * 
 * Requires admin authentication
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

    // Verify admin role
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

    // Fetch all BROKERAGE tier shippers
    const brokerageShippers = await prisma.shipper.findMany({
      where: {
        subscriptionTier: 'BROKERAGE',
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
        subscriptionTier: true,
        dedicatedDispatcherId: true,
        createdAt: true,
        _count: {
          select: {
            loadRequests: true,
            facilities: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch all available dispatchers (ADMIN and DISPATCHER roles)
    const dispatchers = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'DISPATCHER']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Enrich shippers with dispatcher info
    const shippersWithDispatcher = brokerageShippers.map(shipper => {
      const dispatcher = dispatchers.find(d => d.id === shipper.dedicatedDispatcherId)
      return {
        ...shipper,
        dispatcher: dispatcher || null,
        loadCount: shipper._count.loadRequests,
        facilityCount: shipper._count.facilities,
      }
    })

    return NextResponse.json({
      shippers: shippersWithDispatcher,
      dispatchers: dispatchers,
    })
  })(request)
}









