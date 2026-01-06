import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/callback-queue/bulk
 * Bulk update callbacks (mark multiple as called/completed)
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!prisma.callbackQueue) {
      return NextResponse.json(
        { error: 'Callback queue service is temporarily unavailable.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { callbackIds, status, driverId, notes } = body

    if (!callbackIds || !Array.isArray(callbackIds) || callbackIds.length === 0) {
      return NextResponse.json(
        { error: 'callbackIds array is required' },
        { status: 400 }
      )
    }

    if (!status || !['CALLED', 'COMPLETED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be CALLED or COMPLETED' },
        { status: 400 }
      )
    }

    const updateData: any = { status }
    
    if (status === 'CALLED') {
      updateData.calledAt = new Date()
      if (driverId) {
        updateData.driverId = driverId
      }
    } else if (status === 'COMPLETED') {
      updateData.completedAt = new Date()
      if (driverId) {
        updateData.driverId = driverId
      }
    }

    if (notes) {
      updateData.notes = notes
    }

    // Update all callbacks
    const result = await prisma.callbackQueue.updateMany({
      where: {
        id: { in: callbackIds },
      },
      data: updateData,
    })

    // Reorder queue if status changed
    if (status !== 'PENDING') {
      const pendingCallbacks = await prisma.callbackQueue.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      })

      for (let i = 0; i < pendingCallbacks.length; i++) {
        await prisma.callbackQueue.update({
          where: { id: pendingCallbacks[i].id },
          data: { position: i + 1 },
        })
      }
    }

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `Successfully updated ${result.count} callback(s)`,
    })
  } catch (error) {
    console.error('Error bulk updating callbacks:', error)
    return NextResponse.json(
      { error: 'Failed to bulk update callbacks', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

