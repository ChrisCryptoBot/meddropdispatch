import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyAdminRole } from '@/lib/auth-admin'
import { sendDriverApprovalEmail, sendDriverRejectionEmail } from '@/lib/email'

/**
 * POST /api/admin/drivers/[id]/review
 * Approve or reject a pending driver account
 * 
 * Requires admin authentication
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

    const { id: driverId } = await params

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    const body = await nextReq.json().catch(() => ({}))
    const { action, rejectionReason } = body

    if (!action || (action !== 'APPROVE' && action !== 'REJECT')) {
      throw new ValidationError('action must be either "APPROVE" or "REJECT"')
    }

    // Find driver with documents
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        documents: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }
      }
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

    // Get admin user ID from headers
    const adminId = nextReq.headers.get('x-admin-id') || 'system'

    if (action === 'REJECT') {
      // Reject driver (set to INACTIVE)
      const updatedDriver = await prisma.driver.update({
        where: { id: driverId },
        data: {
          status: 'INACTIVE',
        }
      })

      // Send rejection email
      try {
        await sendDriverRejectionEmail({
          to: driver.email,
          firstName: driver.firstName,
          lastName: driver.lastName,
          rejectionReason: rejectionReason || null,
        })
      } catch (error) {
        console.error('Error sending rejection email:', error)
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Driver account rejected',
        driver: {
          id: updatedDriver.id,
          status: updatedDriver.status,
          email: updatedDriver.email,
        }
      })
    } else {
      // APPROVE driver (set to AVAILABLE)
      const updatedDriver = await prisma.driver.update({
        where: { id: driverId },
        data: {
          status: 'AVAILABLE',
        }
      })

      // Send approval email
      try {
        await sendDriverApprovalEmail({
          to: driver.email,
          firstName: driver.firstName,
          lastName: driver.lastName,
          email: driver.email,
        })
      } catch (error) {
        console.error('Error sending approval email:', error)
        // Don't fail the request if email fails
      }

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
 * GET /api/admin/drivers/[id]/review
 * Get driver details with documents for review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const nextReq = req as NextRequest
    
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

    const { id: driverId } = await params

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    // Find driver with documents
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
        documents: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            title: true,
            url: true,
            mimeType: true,
            fileSize: true,
            expiryDate: true,
            verifiedBy: true,
            verifiedAt: true,
            notes: true,
            createdAt: true,
          }
        }
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





