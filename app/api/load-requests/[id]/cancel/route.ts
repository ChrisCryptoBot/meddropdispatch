import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendLoadCancelledNotification } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'

/**
 * POST /api/load-requests/[id]/cancel
 * Cancel a load request with reason and billing rule
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    const { 
      cancellationReason, 
      cancelledBy, 
      cancelledById, 
      cancellationBillingRule,
      notes 
    } = data

    if (!cancellationReason || !cancelledBy) {
      return NextResponse.json(
        { error: 'Cancellation reason and cancelledBy are required' },
        { status: 400 }
      )
    }

    // Valid cancellation reasons
    const validReasons = ['CLIENT_CANCELLED', 'DRIVER_NO_SHOW', 'VEHICLE_BREAKDOWN', 'FACILITY_CLOSED', 'WEATHER', 'OTHER']
    if (!validReasons.includes(cancellationReason)) {
      return NextResponse.json(
        { error: 'Invalid cancellation reason' },
        { status: 400 }
      )
    }

    // Valid billing rules
    const validBillingRules = ['BILLABLE', 'PARTIAL', 'NOT_BILLABLE']
    if (cancellationBillingRule && !validBillingRules.includes(cancellationBillingRule)) {
      return NextResponse.json(
        { error: 'Invalid cancellation billing rule' },
        { status: 400 }
      )
    }

    // Get current load with related data for notifications
    const load = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        shipper: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!load) {
      return NextResponse.json(
        { error: 'Load request not found' },
        { status: 404 }
      )
    }

    if (load.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Load is already cancelled' },
        { status: 400 }
      )
    }

    if (load.status === 'DELIVERED' || load.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot cancel a delivered or completed load' },
        { status: 400 }
      )
    }

    // Update load with cancellation info
    const cancelledLoad = await prisma.loadRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason,
        cancelledBy,
        cancelledById: cancelledById || null,
        cancelledAt: new Date(),
        cancellationBillingRule: cancellationBillingRule || null,
      },
      include: {
        shipper: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Create tracking event
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: id,
        code: 'CANCELLED',
        label: `Load Cancelled - ${cancellationReason.replace(/_/g, ' ')}`,
        description: notes || `Cancelled by ${cancelledBy}. Billing rule: ${cancellationBillingRule || 'Not specified'}`,
        actorId: cancelledById || null,
        actorType: cancelledBy === 'SYSTEM' ? 'SYSTEM' : cancelledBy === 'SHIPPER' ? 'SHIPPER' : cancelledBy === 'DRIVER' ? 'DRIVER' : 'ADMIN',
        locationText: null,
      }
    })

    // Send cancellation notifications to both shipper and driver
    const trackingUrl = getTrackingUrl(cancelledLoad.publicTrackingCode)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const driverPortalUrl = `${baseUrl}/driver/loads`

    const driverName = cancelledLoad.driver 
      ? `${cancelledLoad.driver.firstName || ''} ${cancelledLoad.driver.lastName || ''}`.trim() 
      : null

    await sendLoadCancelledNotification({
      shipperEmail: cancelledLoad.shipper.email,
      driverEmail: cancelledLoad.driver?.email || null,
      companyName: cancelledLoad.shipper.companyName,
      driverName: driverName || undefined,
      trackingCode: cancelledLoad.publicTrackingCode,
      cancellationReason,
      cancelledBy,
      notes: notes || null,
      trackingUrl,
      driverPortalUrl,
    })

    return NextResponse.json({
      success: true,
      loadRequest: cancelledLoad,
    })

  } catch (error) {
    console.error('Error cancelling load request:', error)
    return NextResponse.json(
      { error: 'Failed to cancel load request', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

