import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/admin/drivers/[id]/approve
 * Approve a pending driver account
 * 
 * Requires admin authentication (check via session/cookie)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      const adminId = nextReq.headers.get('x-admin-id')
      const adminRole = nextReq.headers.get('x-admin-role')
      
      if (!adminId || (adminRole !== 'ADMIN' && adminRole !== 'DISPATCHER')) {
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 401 }
        )
      }
    }

    const resolvedParams = await params
    const driverId = resolvedParams.id

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    // Get request body for optional rejection reason
    const body = await nextReq.json().catch(() => ({}))
    const { action, reason } = body // action: 'approve' | 'reject'

    // Find driver
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    if (driver.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { 
          error: 'Driver is not pending approval',
          currentStatus: driver.status
        },
        { status: 400 }
      )
    }

    // Update driver status
    if (action === 'reject') {
      // Reject driver (set to INACTIVE)
      const updatedDriver = await prisma.driver.update({
        where: { id: driverId },
        data: {
          status: 'INACTIVE',
          // Could add a rejectionReason field to Driver model if needed
        }
      })

      // TODO: Send rejection email to driver

      return NextResponse.json({
        success: true,
        message: 'Driver account rejected',
        driver: {
          id: updatedDriver.id,
          status: updatedDriver.status,
        }
      })
    } else {
      // Approve driver (default action)
      const updatedDriver = await prisma.driver.update({
        where: { id: driverId },
        data: {
          status: 'AVAILABLE',
        }
      })

      // TODO: Send approval email to driver

      return NextResponse.json({
        success: true,
        message: 'Driver account approved',
        driver: {
          id: updatedDriver.id,
          status: updatedDriver.status,
          email: updatedDriver.email,
          firstName: updatedDriver.firstName,
          lastName: updatedDriver.lastName,
        }
      })
    }
  })(request)
}

/**
 * GET /api/admin/drivers/[id]/approve
 * Get driver details for approval review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const resolvedParams = await params
    const driverId = resolvedParams.id

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    // Find driver with related data
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
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
        un3373ExpiryDate: true,
        hipaaTrainingDate: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      driver
    })
  })(request)
}

