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

export default function DriverNotificationsPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isMarkingRead, setIsMarkingRead] = useState(false)

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsedDriver = JSON.parse(driverData)
    setDriver(parsedDriver)
    fetchNotifications(parsedDriver.id)
  }, [router])

  const fetchNotifications = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/notifications`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    if (!driver) return

    try {
      const response = await fetch(`/api/drivers/${driver.id}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    if (!driver) return

    try {
      const response = await fetch(`/api/drivers/${driver.id}/notifications`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        // Update unread count if deleted notification was unread
        const deletedNotification = notifications.find((n) => n.id === notificationId)
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
        showToast.success('Notification deleted')
      } else {
        showToast.error('Failed to delete notification')
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      showToast.error('Failed to delete notification')
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!driver || unreadCount === 0) return

    setIsMarkingRead(true)
    try {
      const response = await fetch(`/api/drivers/${driver.id}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        )
        setUnreadCount(0)
        showToast.success('All notifications marked as read')
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
      showToast.error('Failed to mark all as read')
    } finally {
      setIsMarkingRead(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SHIPPER_REQUEST_CALL':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        )
      case 'NEW_LOAD_ASSIGNED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        )
      case 'LOAD_CANCELLED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'DOCUMENT_UPLOADED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'QUOTE_APPROVED':
      case 'QUOTE_REJECTED':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SHIPPER_REQUEST_CALL':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'NEW_LOAD_ASSIGNED':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'LOAD_CANCELLED':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'QUOTE_APPROVED':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'QUOTE_REJECTED':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="glass p-12 rounded-2xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      <div className="sticky top-[73px] z-30 bg-gradient-medical-bg pt-8 pb-4 mb-8 print:mb-4 print:static print:top-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">Notifications</h1>
            {unreadCount > 0 ? (
              <p className="text-sm text-gray-600 print:text-xs">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            ) : (
              <p className="text-gray-600 print:text-sm">View all your notifications</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingRead}
              className="px-4 py-2 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-medical disabled:opacity-50 text-sm mr-6"
            >
              {isMarkingRead ? 'Marking...' : 'Mark All Read'}
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-lg font-medium text-gray-700 mb-2">No notifications yet</p>
          <p className="text-sm text-gray-500">Updates about new loads, call requests, and assignments will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            return (
              <div
                key={notification.id}
                className={`glass-accent rounded-xl p-4 border-2 transition-all ${
                  notification.isRead
                    ? 'border-teal-200/30 bg-teal-50/40'
                    : `${getNotificationColor(notification.type)} bg-teal-50/60`
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      notification.isRead ? 'bg-teal-100 text-teal-600' : getNotificationColor(notification.type).split(' ')[0]
                    }`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {notification.link ? (
                          <Link
                            href={notification.link}
                            onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                            className="block"
                          >
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
                          </Link>
                        ) : (
                          <>
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
                          </>
                        )}
                        {notification.metadata?.shipperPhone && (
                          <div className="mt-2">
                            <a
                              href={`tel:${notification.metadata.shipperPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-primary text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all shadow-lg"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              Call {notification.metadata.shipperName || 'Shipper'}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleMarkAsRead(notification.id)
                            }}
                            className="p-1.5 text-accent-400 hover:text-accent-600 rounded-lg hover:bg-teal-50 transition-colors"
                            title="Mark as read"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteNotification(notification.id)
                          }}
                          className="p-1.5 text-gray-400 hover:text-urgent-600 rounded-lg hover:bg-urgent-50 transition-colors"
                          title="Delete notification"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
