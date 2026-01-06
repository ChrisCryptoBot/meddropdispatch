import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/shippers/[id]/notifications
 * Get all notifications for a shipper
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    const { id } = await params

    // Verify shipper exists
    const shipper = await prisma.shipper.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    // Get query parameters
    const searchParams = nextReq.nextUrl.searchParams
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause - shipper notifications are linked via loadRequest.shipperId
    // We need to find notifications where the loadRequest belongs to this shipper
    const where: any = {
      loadRequest: {
        shipperId: id,
      },
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

    // Also get notifications that might be directly linked to shipper (if userId field is used)
    // Some notifications might be created with userId pointing to admin users
    // For now, we'll focus on loadRequest-based notifications

    // Parse metadata
    const notificationsWithMetadata = notifications.map((notification) => ({
      ...notification,
      metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
    }))

    return NextResponse.json({
      notifications: notificationsWithMetadata,
      totalCount,
      unreadCount: await prisma.notification.count({
        where: {
          loadRequest: {
            shipperId: id,
          },
          isRead: false,
        },
      }),
    })
  })(request)
}

/**
 * PATCH /api/shippers/[id]/notifications
 * Mark notifications as read
 */
export async function PATCH(
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
    const body = await nextReq.json()
    const { notificationIds, markAllAsRead } = body

    // Verify shipper exists
    const shipper = await prisma.shipper.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    if (markAllAsRead) {
      // Mark all shipper's notifications as read
      await prisma.notification.updateMany({
        where: {
          loadRequest: {
            shipperId: id,
          },
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, message: 'All notifications marked as read' })
    }

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Verify notifications belong to this shipper's loads
      const notifications = await prisma.notification.findMany({
        where: {
          id: { in: notificationIds },
          loadRequest: {
            shipperId: id,
          },
        },
        select: { id: true },
      })

      if (notifications.length !== notificationIds.length) {
        return NextResponse.json(
          { error: 'Some notifications not found or do not belong to this shipper' },
          { status: 404 }
        )
      }

      // Mark as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, message: 'Notifications marked as read' })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  })(request)
}

/**
 * DELETE /api/shippers/[id]/notifications/[notificationId]
 * Delete a notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; notificationId: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id, notificationId } = await params

    // Verify shipper exists
    const shipper = await prisma.shipper.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    // Verify notification belongs to this shipper's loads
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        loadRequest: {
          shipperId: id,
        },
      },
    })

    if (!notification) {
      throw new NotFoundError('Notification')
    }

    // Delete notification
    await prisma.notification.delete({
      where: { id: notificationId },
    })

    return NextResponse.json({ success: true, message: 'Notification deleted' })
  })(request)
}

