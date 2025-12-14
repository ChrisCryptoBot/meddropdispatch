'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showToast } from '@/lib/toast'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
  metadata: any
  loadRequest: {
    id: string
    publicTrackingCode: string
    status: string
  } | null
}

export default function ShipperNotificationsPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    const parsed = JSON.parse(shipperData)
    setShipper(parsed)
    // TODO: Fetch notifications when API endpoint is created
    // fetchNotifications(parsed.id)
    setIsLoading(false)
  }, [router])

  const handleDeleteNotification = async (notificationId: string) => {
    if (!shipper) return

    try {
      // TODO: Implement DELETE endpoint for shipper notifications
      // For now, just remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      const deletedNotification = notifications.find((n) => n.id === notificationId)
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
      showToast.success('Notification deleted')
    } catch (error) {
      console.error('Error deleting notification:', error)
      showToast.error('Failed to delete notification')
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Notifications</h1>
        {unreadCount > 0 && (
          <p className="text-sm text-gray-600">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="glass-primary p-12 rounded-2xl text-center border-2 border-blue-200/30 shadow-glass">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-primary p-12 rounded-2xl text-center border-2 border-blue-200/30 shadow-glass">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-lg font-medium text-gray-700 mb-2">No notifications yet</p>
          <p className="text-sm text-gray-500">Updates about your loads and shipments will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const NotificationContent = (
              <div
                className={`glass-primary rounded-xl p-4 border-2 transition-all ${
                  notification.isRead
                    ? 'border-blue-200/30 bg-blue-50/40'
                    : 'border-blue-300/50 bg-blue-50/60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className={`font-semibold mb-1 ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.title}
                        </h3>
                        <p className={`text-sm ${notification.isRead ? 'text-gray-500' : 'text-gray-700'}`}>
                          {notification.message}
                        </p>
                        {notification.loadRequest && (
                          <p className="text-xs text-gray-500 mt-1">
                            Load: {notification.loadRequest.publicTrackingCode}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="p-1.5 text-gray-400 hover:text-urgent-600 rounded-lg hover:bg-urgent-50 transition-colors flex-shrink-0"
                        title="Delete notification"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )

            if (notification.link) {
              return (
                <Link
                  key={notification.id}
                  href={notification.link}
                >
                  {NotificationContent}
                </Link>
              )
            }

            return <div key={notification.id}>{NotificationContent}</div>
          })}
        </div>
      )}
    </div>
  )
}

