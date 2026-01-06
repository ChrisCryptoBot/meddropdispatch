import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { findBestDriverForLoad, autoAssignDriver } from '@/lib/auto-driver-assignment'
import { sendDriverLoadStatusEmail } from '@/lib/email'
import { z } from 'zod'

const autoAssignSchema = z.object({
  overrideDriverId: z.string().optional(),
  assign: z.boolean().default(false), // If true, actually assign; if false, just preview
})

/**
 * GET /api/load-requests/[id]/auto-assign-driver
 * Preview driver assignment without actually assigning
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    // Verify load request exists
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Check if load is in a valid state for assignment
    if (loadRequest.status === 'DELIVERED' || loadRequest.status === 'COMPLETED' || loadRequest.status === 'CANCELLED') {
      return NextResponse.json(
        {
          error: 'Cannot assign driver',
          message: `Cannot assign driver to load with status: ${loadRequest.status}`,
        },
        { status: 400 }
      )
    }

    // Find best driver
    const assignmentResult = await findBestDriverForLoad(id)

    return NextResponse.json({
      success: true,
      recommendedDriver: assignmentResult.recommendedDriver,
      alternativeDrivers: assignmentResult.alternativeDrivers,
      message: assignmentResult.message,
    })
  })(request)
}

/**
 * POST /api/load-requests/[id]/auto-assign-driver
 * Auto-assign a driver to a load
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await nextReq.json().catch(() => ({}))
    const validation = autoAssignSchema.safeParse(rawData)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid request data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { overrideDriverId, assign } = validation.data

    // Verify load request exists
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Check if load is in a valid state for assignment
    if (loadRequest.status === 'DELIVERED' || loadRequest.status === 'COMPLETED' || loadRequest.status === 'CANCELLED') {
      return NextResponse.json(
        {
          error: 'Cannot assign driver',
          message: `Cannot assign driver to load with status: ${loadRequest.status}`,
        },
        { status: 400 }
      )
    }

    // If assign is false, just return preview
    if (!assign) {
      const assignmentResult = await findBestDriverForLoad(id)
      return NextResponse.json({
        success: true,
        preview: assignmentResult,
        message: 'Driver assignment preview generated',
      })
    }

    // Auto-assign driver
    const result = await autoAssignDriver(id, overrideDriverId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 400 }
      )
    }

    // Send notification to driver if assigned
    if (result.driver) {
      try {
        const trackingUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/driver/loads/${id}`
        
        // Create notification for driver
        await prisma.notification.create({
          data: {
            driverId: result.driver.id,
            loadRequestId: id,
            type: 'NEW_LOAD_ASSIGNED',
            title: 'New Load Assigned',
            message: `You have been assigned to load ${loadRequest.publicTrackingCode}`,
            link: trackingUrl,
          },
        })

        // Send email to driver using driver-specific template
        const pickupAddress = `${loadRequest.pickupFacility.addressLine1}, ${loadRequest.pickupFacility.city}, ${loadRequest.pickupFacility.state} ${loadRequest.pickupFacility.postalCode}`
        const dropoffAddress = `${loadRequest.dropoffFacility.addressLine1}, ${loadRequest.dropoffFacility.city}, ${loadRequest.dropoffFacility.state} ${loadRequest.dropoffFacility.postalCode}`
        const driverName = `${result.driver.firstName} ${result.driver.lastName}`
        
        await sendDriverLoadStatusEmail({
          to: result.driver.email,
          driverName,
          trackingCode: loadRequest.publicTrackingCode,
          status: 'SCHEDULED',
          statusLabel: 'Load Assigned',
          companyName: loadRequest.shipper.companyName,
          pickupAddress,
          dropoffAddress,
          readyTime: loadRequest.readyTime || null,
          deliveryDeadline: loadRequest.deliveryDeadline || null,
          driverPortalUrl: trackingUrl,
        })
      } catch (emailError) {
        // Log error but don't fail the request
        console.error('Error sending driver notification:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      driver: result.driver,
      loadRequest: result.loadRequest,
      message: result.message,
    })
  })(request)
}

