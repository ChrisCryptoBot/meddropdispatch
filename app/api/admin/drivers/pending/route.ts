import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/admin/drivers/pending
 * Get all drivers pending approval
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
    const { verifyAdminRole } = await import('@/lib/auth-admin')
    const isAdmin = await verifyAdminRole(nextReq)
    if (!isAdmin) {
      // Fallback: Check for admin in request headers (set by frontend)
      const adminId = nextReq.headers.get('x-admin-id')
      const adminRole = nextReq.headers.get('x-admin-role')
      
      if (!adminId || (adminRole !== 'ADMIN' && adminRole !== 'DISPATCHER')) {
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 401 }
        )
      }
    }

    // Get query parameters
    const { searchParams } = new URL(nextReq.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Find all pending drivers
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where: {
          status: 'PENDING_APPROVAL'
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
          licenseNumber: true,
          licenseExpiry: true,
          vehicleType: true,
          vehicleMake: true,
          vehicleModel: true,
          vehicleYear: true,
          vehiclePlate: true,
          hasRefrigeration: true,
          un3373Certified: true,
          createdAt: true,
          _count: {
            select: {
              documents: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'asc' // Oldest first
        },
        skip,
        take: limit,
      }),
      prisma.driver.count({
        where: {
          status: 'PENDING_APPROVAL'
        }
      })
    ])

    // Transform drivers to include document count
    const driversWithCounts = drivers.map(driver => ({
      ...driver,
      documentCount: (driver as any)._count?.documents || 0
    }))

    return NextResponse.json({
      drivers: driversWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  })(request)
}

