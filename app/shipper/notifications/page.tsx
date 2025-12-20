'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showToast } from '@/lib/toast'
import { groupNotifications, type GroupBy, type NotificationGroup, type Notification as NotificationType } from '@/lib/notification-grouping'

interface Notification extends NotificationType {}

export default function ShipperNotificationsPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [groupBy, setGroupBy] = useState<GroupBy>('date')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    const parsed = JSON.parse(shipperData)
    setShipper(parsed)
    fetchNotifications(parsed.id)
  }, [router])

  const fetchNotifications = async (shipperId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/shippers/${shipperId}/notifications?limit=100`)
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
    if (!shipper) return

    try {
      const response = await fetch(`/api/shippers/${shipper.id}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    if (!shipper) return

    try {
      // Try to delete via API first
      const response = await fetch(`/api/shippers/${shipper.id}/notifications`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        const deletedNotification = notifications.find((n) => n.id === notificationId)
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
        // Dispatch custom event to notify layout dropdown
        window.dispatchEvent(new CustomEvent('notificationDeleted', { detail: { notificationId } }))
        showToast.success('Notification deleted')
      } else {
        // Fallback: just remove from local state if API doesn't support DELETE yet
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        const deletedNotification = notifications.find((n) => n.id === notificationId)
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
        // Dispatch custom event to notify layout dropdown
        window.dispatchEvent(new CustomEvent('notificationDeleted', { detail: { notificationId } }))
        showToast.success('Notification deleted')
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      showToast.error('Failed to delete notification')
    }
  }

  // Group notifications
  const groupedNotifications = useMemo(() => {
    return groupNotifications(notifications, groupBy)
  }, [notifications, groupBy])

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Notifications</h1>
            {unreadCount > 0 ? (
              <p className="text-sm text-gray-600">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            ) : (
              <p className="text-sm text-gray-600">View all your notifications</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Group by:</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="none">None</option>
              <option value="type">Type</option>
              <option value="date">Date</option>
            </select>
          </div>
        </div>
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
      ) : groupedNotifications ? (
        <div className="space-y-4">
          {groupedNotifications.map((group) => {
            const isCollapsed = collapsedGroups.has(group.key)
            return (
              <div key={group.key} className="glass-primary rounded-2xl border-2 border-blue-200/30 shadow-glass overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 text-gray-600 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <h3 className="text-lg font-bold text-gray-900">{group.label}</h3>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      {group.notifications.length}
                    </span>
                    {group.unreadCount > 0 && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        {group.unreadCount} unread
                      </span>
                    )}
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="px-6 pb-4 space-y-3">
                    {group.notifications.map((notification) => {
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
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDeleteNotification(notification.id)
                                  }}
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
                          <Link key={notification.id} href={notification.link}>
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
          })}
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
                <Link key={notification.id} href={notification.link}>
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

