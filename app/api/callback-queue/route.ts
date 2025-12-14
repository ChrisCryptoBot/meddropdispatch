import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/callback-queue
 * Add shipper to callback queue
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shipperId } = body

    if (!shipperId) {
      return NextResponse.json(
        { error: 'Shipper ID is required' },
        { status: 400 }
      )
    }

    // Check if CallbackQueue model is available
    if (!prisma.callbackQueue) {
      console.error('CallbackQueue model not available. Prisma client needs to be regenerated.')
      return NextResponse.json(
        { error: 'Callback queue service is temporarily unavailable. Please try again in a moment.' },
        { status: 503 }
      )
    }

    // Check if shipper already has a pending callback
    const existingCallback = await prisma.callbackQueue.findFirst({
      where: {
        shipperId,
        status: 'PENDING',
      },
    })

    if (existingCallback) {
      // Return existing position
      const position = await prisma.callbackQueue.count({
        where: {
          status: 'PENDING',
          position: { lte: existingCallback.position },
        },
      })

      return NextResponse.json({
        callbackId: existingCallback.id,
        position,
        message: 'You are already in the callback queue',
      })
    }

    // Get the next position in queue
    const maxPosition = await prisma.callbackQueue.findFirst({
      where: { status: 'PENDING' },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const nextPosition = (maxPosition?.position || 0) + 1

    // Create new callback request
    const callback = await prisma.callbackQueue.create({
      data: {
        shipperId,
        position: nextPosition,
        status: 'PENDING',
      },
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

    // Create notifications for ALL drivers when shipper joins callback queue
    try {
      const allDrivers = await prisma.driver.findMany({
        where: {
          status: { in: ['AVAILABLE', 'BUSY', 'OFFLINE'] }, // Notify all active drivers
        },
        select: {
          id: true,
        },
      })

      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const callbackQueueUrl = `${baseUrl}/driver/callback-queue`

      // Create notification for each driver
      const notificationPromises = allDrivers.map((driver) =>
        prisma.notification.create({
          data: {
            driverId: driver.id,
            type: 'SHIPPER_REQUEST_CALL',
            title: `New Callback Request: ${callback.shipper.companyName}`,
            message: `${callback.shipper.contactName} from ${callback.shipper.companyName} is requesting a callback. Position #${nextPosition} in queue.`,
            link: callbackQueueUrl,
            metadata: JSON.stringify({
              callbackId: callback.id,
              shipperId: callback.shipper.id,
              companyName: callback.shipper.companyName,
              contactName: callback.shipper.contactName,
              phone: callback.shipper.phone,
              email: callback.shipper.email,
              position: nextPosition,
            }),
          },
        })
      )

      await Promise.all(notificationPromises)
    } catch (notificationError) {
      // Don't fail the callback creation if notifications fail
      console.error('Error creating callback notifications:', notificationError)
    }

    return NextResponse.json({
      callbackId: callback.id,
      position: nextPosition,
      message: 'You have been added to the callback queue',
    })
  } catch (error) {
    console.error('Error adding to callback queue:', error)
    return NextResponse.json(
      { error: 'Failed to add to callback queue', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/callback-queue
 * Get callback queue (for admin/dispatch) or shipper's position
 */
export async function GET(request: NextRequest) {
  try {
    // Check if CallbackQueue model is available
    if (!prisma.callbackQueue) {
      console.error('CallbackQueue model not available. Prisma client needs to be regenerated.')
      return NextResponse.json(
        { error: 'Callback queue service is temporarily unavailable. Please try again in a moment.' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const shipperId = searchParams.get('shipperId')

    if (shipperId) {
      // Get shipper's most recent callback (any status)
      const callback = await prisma.callbackQueue.findFirst({
        where: {
          shipperId,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          shipper: {
            select: {
              companyName: true,
              contactName: true,
              phone: true,
            },
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          loadRequest: {
            select: {
              id: true,
              publicTrackingCode: true,
              status: true,
            },
          },
        },
      })

      if (!callback) {
        return NextResponse.json({
          inQueue: false,
          position: null,
          status: null,
        })
      }

      // If callback is PENDING, calculate actual position
      let position: number | null = null
      if (callback.status === 'PENDING') {
        position = await prisma.callbackQueue.count({
          where: {
            status: 'PENDING',
            position: { lte: callback.position },
          },
        })
      }

      return NextResponse.json({
        inQueue: callback.status === 'PENDING',
        callbackId: callback.id,
        position,
        status: callback.status,
        calledAt: callback.calledAt,
        completedAt: callback.completedAt,
        createdAt: callback.createdAt,
        driver: callback.driver,
        shipper: callback.shipper,
        loadRequestId: callback.loadRequestId,
        loadRequest: callback.loadRequest,
      })
    } else {
      // Get all callbacks (for admin/dispatch/drivers) - show all statuses
      try {
        const callbacks = await prisma.callbackQueue.findMany({
          where: {},
          orderBy: [
            { status: 'asc' }, // PENDING first
            { position: 'asc' },
            { createdAt: 'desc' },
          ],
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
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            loadRequest: {
              select: {
                id: true,
                publicTrackingCode: true,
                status: true,
              },
            },
          },
        })

        return NextResponse.json({ callbacks })
      } catch (dbError: any) {
        // Handle case where driver relation might not exist yet
        if (dbError.message?.includes('driver') || dbError.message?.includes('Unknown argument')) {
          console.error('Database schema issue - driver relation may not be available:', dbError)
          // Try without driver relation
          const callbacks = await prisma.callbackQueue.findMany({
            where: {},
            orderBy: [
              { status: 'asc' },
              { position: 'asc' },
              { createdAt: 'desc' },
            ],
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

          // Manually add null driver to each callback
          const callbacksWithDriver = callbacks.map(cb => ({
            ...cb,
            driver: null,
          }))

          return NextResponse.json({ callbacks: callbacksWithDriver })
        }
        throw dbError
      }
    }
  } catch (error) {
    console.error('Error fetching callback queue:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch callback queue', 
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

