import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers/[id]/notifications
 * Get all notifications for a driver
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    const { id } = await params

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {
      driverId: id,
    }

    if (unreadOnly) {
      where.isRead = false
    }

    // Fetch notifications
    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          loadRequest: {
            select: {
              id: true,
              publicTrackingCode: true,
              status: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ])

    // Parse metadata
    const notificationsWithMetadata = notifications.map((notification) => ({
      ...notification,
      metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
    }))

    return NextResponse.json({
      notifications: notificationsWithMetadata,
      totalCount,
      unreadCount: await prisma.notification.count({
        where: { driverId: id, isRead: false },
      }),
    })
  })(request)
}

/**
 * PATCH /api/drivers/[id]/notifications
 * Mark notifications as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const body = await req.json()
    const { notificationIds, markAllAsRead } = body

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    if (markAllAsRead) {
      // Mark all unread notifications as read
      await prisma.notification.updateMany({
        where: {
          driverId: id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      })
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'notificationIds array is required',
        },
        { status: 400 }
      )
    }

    // Mark specific notifications as read
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        driverId: id, // Ensure driver owns these notifications
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read',
    })
  })(request)
}

