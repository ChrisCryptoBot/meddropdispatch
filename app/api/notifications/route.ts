// Notifications API Route
// GET: Get notifications for the current admin user (from Notification model)
// Also returns unread count for NotificationBell component

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/notifications
 * Get notifications for the current admin user (from Notification model)
 * Also returns unread count for NotificationBell component
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const userId = searchParams.get('userId') // Optional: filter by user

    // Build where clause
    const whereClause: any = {}

    if (userId) {
      whereClause.OR = [
        { userId: userId },
        { userId: null }, // null = broadcast to all admins
      ]
    } else {
      // If no userId, show all (for backward compatibility)
      whereClause.userId = null
    }

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        ...whereClause,
        isRead: false,
      },
    })

    // Get recent notifications
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return NextResponse.json({
      unreadCount,
      notifications,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Create a new notification (for internal use by system)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, message, link } = body

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, message' },
        { status: 400 }
      )
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: userId || null, // null = broadcast to all admins
        type,
        title,
        message,
        link,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

