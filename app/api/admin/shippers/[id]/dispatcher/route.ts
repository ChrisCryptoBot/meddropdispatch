import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyAdminRole } from '@/lib/auth-admin'

/**
 * POST /api/admin/shippers/[id]/dispatcher
 * Assign or unassign a dispatcher to a brokerage shipper
 * 
 * Requires admin authentication
 * Body: { dispatcherId: string | null }
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
      const adminId = nextReq.headers.get('x-admin-id')
      const adminRole = nextReq.headers.get('x-admin-role')
      
      if (!adminId || (adminRole !== 'ADMIN' && adminRole !== 'DISPATCHER')) {
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 401 }
        )
      }
    }

    const { id: shipperId } = await params

    if (!shipperId) {
      return NextResponse.json(
        { error: 'Shipper ID is required' },
        { status: 400 }
      )
    }

    const body = await nextReq.json().catch(() => ({}))
    const { dispatcherId } = body

    // Validate dispatcherId is either null or a valid string
    if (dispatcherId !== null && dispatcherId !== undefined && typeof dispatcherId !== 'string') {
      throw new ValidationError('dispatcherId must be a string or null')
    }

    // Find shipper
    const shipper = await prisma.shipper.findUnique({
      where: { id: shipperId },
    })

    if (!shipper) {
      return NextResponse.json(
        { error: 'Shipper not found' },
        { status: 404 }
      )
    }

    // Verify shipper is BROKERAGE tier
    if (shipper.subscriptionTier !== 'BROKERAGE') {
      return NextResponse.json(
        { error: 'Dispatcher assignment is only available for BROKERAGE tier shippers' },
        { status: 400 }
      )
    }

    // If dispatcherId is provided, verify it exists and has correct role
    if (dispatcherId) {
      const dispatcher = await prisma.user.findUnique({
        where: { id: dispatcherId },
        select: { id: true, role: true }
      })

      if (!dispatcher) {
        return NextResponse.json(
          { error: 'Dispatcher not found' },
          { status: 404 }
        )
      }

      if (dispatcher.role !== 'ADMIN' && dispatcher.role !== 'DISPATCHER') {
        return NextResponse.json(
          { error: 'User must have ADMIN or DISPATCHER role' },
          { status: 400 }
        )
      }
    }

    // Update shipper with dispatcher assignment
    const updatedShipper = await prisma.shipper.update({
      where: { id: shipperId },
      data: {
        dedicatedDispatcherId: dispatcherId || null,
      },
      select: {
        id: true,
        companyName: true,
        dedicatedDispatcherId: true,
      }
    })

    return NextResponse.json({
      success: true,
      message: dispatcherId 
        ? 'Dispatcher assigned successfully' 
        : 'Dispatcher unassigned successfully',
      shipper: updatedShipper,
    })
  })(request)
}





