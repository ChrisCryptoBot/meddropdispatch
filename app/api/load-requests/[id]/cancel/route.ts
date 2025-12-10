import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Get current load
    const load = await prisma.loadRequest.findUnique({
      where: { id },
      select: { status: true }
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
      }
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

