import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/callback-queue/[id]
 * Update callback status (called, completed, cancelled)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if CallbackQueue model is available
    if (!prisma.callbackQueue) {
      console.error('CallbackQueue model not available. Prisma client needs to be regenerated.')
      return NextResponse.json(
        { error: 'Callback queue service is temporarily unavailable. Please try again in a moment.' },
        { status: 503 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { status, notes, driverId, priority } = body

    if (!status || !['CALLED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be CALLED, COMPLETED, or CANCELLED' },
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
    } else if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date()
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (priority && ['NORMAL', 'HIGH', 'URGENT'].includes(priority)) {
      updateData.priority = priority
    }

    // Reassign callback (set driverId to null or new driver)
    if (body.reassign !== undefined) {
      if (body.reassign === true || body.reassign === null) {
        // Unassign current driver
        updateData.driverId = null
        if (status === 'CALLED') {
          // Reset called status if unassigning
          updateData.calledAt = null
        }
      } else if (typeof body.reassign === 'string') {
        // Assign to new driver
        updateData.driverId = body.reassign
      }
    }

    let callback: any
    try {
      // Try with driver relation first
      callback = await prisma.callbackQueue.update({
        where: { id },
        data: updateData,
        include: {
          shipper: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              phone: true,
              email: true,
            },
          },
          // @ts-ignore - driver relation may not exist in Prisma client yet
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })
    } catch (prismaError: any) {
      // If driverId field or driver relation doesn't exist in Prisma client yet, try without it
      if (prismaError.message?.includes('driverId') || prismaError.message?.includes('Unknown argument') || prismaError.message?.includes('driver')) {
        console.warn('Prisma client does not recognize driverId field or driver relation. Regenerating Prisma client is required.')
        // Remove driverId from update and try again
        const { driverId: _, ...updateDataWithoutDriver } = updateData
        callback = await prisma.callbackQueue.update({
          where: { id },
          data: updateDataWithoutDriver,
          include: {
            shipper: {
              select: {
                id: true,
                companyName: true,
                contactName: true,
                phone: true,
                email: true,
              },
            },
          },
        })
        // Manually add null driver since relation might not be available
        callback = { ...callback, driver: null }
      } else {
        throw prismaError
      }
    }

    // If status changed, reorder remaining pending callbacks
    if (status !== 'PENDING') {
      await reorderQueue()
    }

    // Mark related notifications as read when callback is marked as called or completed
    if ((status === 'CALLED' || status === 'COMPLETED') && driverId) {
      try {
        await prisma.notification.updateMany({
          where: {
            driverId: driverId,
            type: 'SHIPPER_REQUEST_CALL',
            isRead: false,
            metadata: {
              contains: `"callbackId":"${id}"`,
            },
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        })
      } catch (notificationError) {
        // Don't fail if notification update fails
        console.error('Error updating callback notifications:', notificationError)
      }
    }

    // Send email notification to shipper when callback is marked as CALLED
    if (status === 'CALLED' && callback && 'shipper' in callback && callback.shipper) {
      try {
        const { sendCallbackCalledEmail } = await import('@/lib/email')
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const callbackQueueUrl = `${baseUrl}/shipper/request-load`
        
        // Get driver info if available
        let driverName = 'A MED DROP driver'
        let driverPhone = ''
        
        if (driverId) {
          const driver = await prisma.driver.findUnique({
            where: { id: driverId },
            select: { firstName: true, lastName: true, phone: true },
          })
          if (driver) {
            driverName = `${driver.firstName} ${driver.lastName}`
            driverPhone = driver.phone || ''
          }
        } else if ('driver' in callback && callback.driver && callback.driver !== null) {
          const driverData = callback.driver as { firstName: string; lastName: string; id: string }
          driverName = `${driverData.firstName} ${driverData.lastName}`
          // Get driver phone from database
          const driver = await prisma.driver.findUnique({
            where: { id: driverData.id },
            select: { phone: true },
          })
          driverPhone = driver?.phone || ''
        }

        await sendCallbackCalledEmail({
          to: callback.shipper.email,
          companyName: callback.shipper.companyName,
          contactName: callback.shipper.contactName,
          driverName,
          driverPhone,
          callbackQueueUrl,
          baseUrl,
        })
      } catch (emailError) {
        // Don't fail the callback update if email fails
        console.error('Error sending callback called email:', emailError)
      }
    }

    return NextResponse.json({ callback })
  } catch (error) {
    console.error('Error updating callback:', error)
    return NextResponse.json(
      { error: 'Failed to update callback', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/callback-queue/[id]
 * Remove callback from queue (cancellation)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if CallbackQueue model is available
    if (!prisma.callbackQueue) {
      console.error('CallbackQueue model not available. Prisma client needs to be regenerated.')
      return NextResponse.json(
        { error: 'Callback queue service is temporarily unavailable. Please try again in a moment.' },
        { status: 503 }
      )
    }

    const { id } = await params

    await prisma.callbackQueue.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    })

    // Reorder remaining callbacks
    await reorderQueue()

    return NextResponse.json({ message: 'Callback cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling callback:', error)
    return NextResponse.json(
      { error: 'Failed to cancel callback', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Reorder queue positions after a callback is removed
 */
async function reorderQueue() {
  if (!prisma.callbackQueue) {
    console.error('CallbackQueue model not available for reordering')
    return
  }

  const pendingCallbacks = await prisma.callbackQueue.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  })

  // Update positions sequentially
  for (let i = 0; i < pendingCallbacks.length; i++) {
    await prisma.callbackQueue.update({
      where: { id: pendingCallbacks[i].id },
      data: { position: i + 1 },
    })
  }
}

