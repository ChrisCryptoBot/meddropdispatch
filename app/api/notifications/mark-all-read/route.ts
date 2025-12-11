// Mark All Notifications as Read API Route
// POST: Mark all notifications as read for current user

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read (optionally filtered by userId)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') // Optional: filter by user

    // Build where clause
    const whereClause: any = {
      isRead: false,
    }

    if (userId) {
      whereClause.OR = [
        { userId: userId },
        { userId: null }, // null = broadcast to all admins
      ]
    } else {
      // If no userId, mark all unread as read
      whereClause.userId = null
    }

    // Update all unread notifications
    const result = await prisma.notification.updateMany({
      where: whereClause,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      count: result.count,
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    )
  }
}

