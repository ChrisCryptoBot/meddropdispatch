'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import MobileBottomNav from '@/components/features/MobileBottomNav'
import ShiftClockWidget from '@/components/features/ShiftClockWidget'

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dismissedNotificationsRef = useRef<Set<string>>(new Set())
  const [shouldShake, setShouldShake] = useState(false)
  const [lastNotificationCount, setLastNotificationCount] = useState(0)
  const [pendingCallbackCount, setPendingCallbackCount] = useState(0)
  const [adminModeEnabled, setAdminModeEnabled] = useState(false)
  const authCheckedRef = useRef(false)

  useEffect(() => {
    // Don't check auth on login or signup pages
    if (pathname === '/driver/login' || pathname === '/driver/signup') {
      setIsChecking(false)
      authCheckedRef.current = false // Reset when on login/signup pages
      return
    }

    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    // Skip if we've already checked auth and have a driver (unless navigating to a new protected route)
    if (authCheckedRef.current && driver) {
      setIsChecking(false)
      return
    }

    // Check authentication via API (httpOnly cookies)
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include' // Ensure cookies are sent
        })
        const data = await response.json()

        if (data.authenticated && data.user && data.user.userType === 'driver') {
          // Auth verified via httpOnly cookie - store user data in state
          setDriver(data.user)
          // Check if admin mode is enabled (stored separately, not auth-related)
          const adminMode = localStorage.getItem('driverAdminMode') === 'true'
          setAdminModeEnabled(adminMode && data.user.isAdmin)
          setIsChecking(false)
          authCheckedRef.current = true
        } else {
          // Not authenticated - clear any stale data
          setDriver(null)
          setIsChecking(false)
          authCheckedRef.current = false
          // Only redirect if we're not already on login/signup page
          if (pathname !== '/driver/login' && pathname !== '/driver/signup') {
            router.push('/driver/login')
          }
        }
      } catch (error) {
        console.error('Error checking driver auth:', error)
        // Authentication check failed - redirect to login
        setDriver(null)
        setIsChecking(false)
        authCheckedRef.current = false
        if (pathname !== '/driver/login' && pathname !== '/driver/signup') {
          router.push('/driver/login')
        }
      }
    }

    checkAuth()
  }, [pathname]) // Only re-run when pathname changes, but use ref to prevent unnecessary re-checks

  // Close dropdown when route changes
  useEffect(() => {
    setProfileDropdownOpen(false)
    setNotificationDropdownOpen(false)
  }, [pathname])

  // Fetch notifications
  useEffect(() => {
    if (!driver?.id) return

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/drivers/${driver.id}/notifications?limit=5`)
        if (response.ok) {
          const data = await response.json()
          const allNotifications = data.notifications || []
          // Filter out dismissed notifications from dropdown
          const filteredNotifications = allNotifications.filter(
            (n: any) => !dismissedNotificationsRef.current.has(n.id)
          )
          setNotifications(filteredNotifications)
          // Count unread from all notifications (not filtered) - this is the total unread count
          const unread = allNotifications.filter((n: any) => !n.isRead).length
          setUnreadCount(unread)
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }

    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    // Listen for notification deletion events from notification page
    const handleNotificationDeleted = (event: CustomEvent) => {
      // Remove from dismissed list if it was dismissed, so it won't reappear
      dismissedNotificationsRef.current.delete(event.detail.notificationId)
      fetchNotifications()
    }
    window.addEventListener('notificationDeleted', handleNotificationDeleted as EventListener)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('notificationDeleted', handleNotificationDeleted as EventListener)
    }
  }, [driver?.id])


  // Fetch pending callback count
  useEffect(() => {
    if (!driver?.id) return

    const fetchCallbackCount = async () => {
      try {
        const response = await fetch('/api/callback-queue')
        if (response.ok) {
          const data = await response.json()
          const pendingCount = (data.callbacks || []).filter((cb: any) => cb.status === 'PENDING').length
          setPendingCallbackCount(pendingCount)
        }
      } catch (error) {
        console.error('Error fetching callback count:', error)
      }
    }

    fetchCallbackCount()
    // Poll for callback count updates every 10 seconds (more frequent than notifications)
    const interval = setInterval(fetchCallbackCount, 10000)
    
    // Listen for custom events when callbacks are updated
    const handleCallbackUpdate = () => {
      fetchCallbackCount()
    }
    window.addEventListener('callbackQueueUpdated', handleCallbackUpdate)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('callbackQueueUpdated', handleCallbackUpdate)
    }
  }, [driver?.id])

  // Check if driver is pending approval and redirect
  useEffect(() => {
    // Only run after auth check is complete and we have driver data
    if (!isChecking && driver && authCheckedRef.current) {
      if (driver.status === 'PENDING_APPROVAL') {
        // Allow access to pending-approval, profile, and support pages
        const allowedPaths = ['/driver/pending-approval', '/driver/profile', '/driver/support', '/driver/login', '/driver/signup']
        if (!allowedPaths.includes(pathname)) {
          router.push('/driver/pending-approval')
          return // Prevent further execution
        }
      } else if (driver.status !== 'PENDING_APPROVAL' && pathname === '/driver/pending-approval') {
        // If approved and on pending page, redirect to dashboard
        router.push('/driver/dashboard')
        return // Prevent further execution
      }
    }
  }, [driver?.status, pathname, isChecking]) // Include isChecking to prevent premature redirects

  // Show loading while checking auth
  if (isChecking && pathname !== '/driver/login' && pathname !== '/driver/signup' && pathname !== '/driver/pending-approval') {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't show layout on login/signup pages
  if (pathname === '/driver/login' || pathname === '/driver/signup' || pathname === '/driver/pending-approval') {
    return <>{children}</>
  }

  const navigation = [
    {
      name: 'Callback Queue',
      href: '/driver/callback-queue',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      highlight: true,
    },
    {
      name: 'Load Board',
      href: '/driver/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Scheduler',
      href: '/driver/scheduler',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Load Documents',
      href: '/driver/documents',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'History',
      href: '/driver/history',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Shippers',
      href: '/driver/shippers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    // Business tab - shown for owner-operators (isAdmin drivers) or fleet members
    ...((driver?.isAdmin || (driver?.fleetRole && driver.fleetRole !== 'INDEPENDENT')) ? [{
      name: 'Business',
      href: '/driver/business',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      highlight: true,
    }] : []),
  ]

  // Admin navigation items (only shown when admin mode is enabled)
  const adminNavigation = [
    {
      name: 'Admin Dashboard',
      href: '/driver/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'All Loads',
      href: '/driver/admin/loads',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Manage Shippers',
      href: '/driver/admin/shippers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      name: 'Invoices',
      href: '/driver/admin/invoices',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
        </svg>
      ),
    },
    {
      name: 'System Logs',
      href: '/driver/admin/logs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Audit Logs',
      href: '/driver/admin/audit',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      name: 'User Activity',
      href: '/driver/admin/users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: 'System Diagnostics',
      href: '/driver/admin/diagnostics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ]

  // Show Business tab for isAdmin drivers OR fleet members (OWNER/ADMIN/DRIVER)
  const hasBusinessAccess = driver?.isAdmin || 
    (driver?.fleetRole && driver.fleetRole !== 'INDEPENDENT')

  // Combine navigation items - admin items appear after driver items when admin mode is enabled
  const allNavigation = adminModeEnabled && driver?.isAdmin 
    ? [...navigation, ...adminNavigation]
    : navigation

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header - Same as Homepage */}
      <header className="bg-slate-900/95 backdrop-blur-xl fixed top-0 left-0 right-0 z-[60] border-b border-slate-700/50 flex-shrink-0 h-[85px]">
        <div className="w-full py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 pl-4 md:pl-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">MED DROP</h1>
                <p className="text-sm font-semibold text-slate-400">Medical Courier Services</p>
              </div>
            </div>
            <nav className="flex items-center space-x-3 pr-4">
              {/* Shift Clock Widget (Fleet Enterprise - Tier 1) */}
              {driver?.id && (
                <ShiftClockWidget driverId={driver.id} />
              )}
              <div className="relative">
                <button
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                  className={`p-3 rounded-lg transition-base relative ${
                    notificationDropdownOpen
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-urgent-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notificationDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[45] md:left-64" onClick={() => setNotificationDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 bg-slate-800/95 backdrop-blur-xl rounded-lg shadow-xl z-[60] border border-slate-700/50 overflow-hidden max-h-96 overflow-y-auto">
                      <div className="p-3 border-b border-slate-700/50 bg-slate-800/80">
                        <h3 className="font-semibold text-white">Notifications</h3>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-slate-400 text-sm">No notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-700/50">
                          {notifications.map((notification) => {
                            // Determine the appropriate route based on notification type and metadata
                            const getNotificationRoute = (notif: any): string => {
                              // If link is already set, use it
                              if (notif.link) {
                                return notif.link
                              }
                              
                              // If notification has loadRequestId, route to load detail page
                              if (notif.loadRequestId) {
                                const baseRoute = `/driver/loads/${notif.loadRequestId}`
                                
                                // Route to specific sections based on notification type
                                switch (notif.type) {
                                  case 'DOCUMENT_UPLOADED':
                                    return `${baseRoute}#documents`
                                  case 'LOAD_STATUS_CHANGED':
                                  case 'LOAD_CANCELLED':
                                    return `${baseRoute}#status`
                                  case 'SHIPPER_REQUEST_CALL':
                                    // For call requests, route to the load page (contact info is in pickup/dropoff sections)
                                    return baseRoute
                                  case 'NEW_LOAD_ASSIGNED':
                                    // For new loads, go to the main page (they might need to accept it)
                                    return baseRoute
                                  default:
                                    return baseRoute
                                }
                              }
                              
                              // Default fallback
                              return '/driver/notifications'
                            }
                            
                            const notificationRoute = getNotificationRoute(notification)
                            
                            return (
                            <Link
                              key={notification.id}
                              href={notificationRoute}
                              onClick={async (e) => {
                                e.preventDefault()
                                setNotificationDropdownOpen(false)
                                
                                // Mark as read via API (if unread)
                                if (!notification.isRead && driver?.id) {
                                  try {
                                    await fetch(`/api/drivers/${driver.id}/notifications`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ notificationIds: [notification.id] }),
                                    })
                                    setUnreadCount(prev => Math.max(0, prev - 1))
                                  } catch (error) {
                                    console.error('Error marking notification as read:', error)
                                  }
                                }
                                
                                // Dismiss from dropdown (but keep on notification page)
                                dismissedNotificationsRef.current.add(notification.id)
                                setNotifications(prev => 
                                  prev.filter(n => n.id !== notification.id)
                                )
                                
                                // Navigate to the appropriate route
                                router.push(notificationRoute)
                                
                                // If route has a hash, scroll to that section after navigation
                                if (notificationRoute.includes('#')) {
                                  // Wait for navigation to complete, then scroll
                                  setTimeout(() => {
                                    const hash = notificationRoute.split('#')[1]
                                    const element = document.getElementById(hash)
                                    if (element) {
                                      // Scroll to element
                                      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                      // Highlight the section briefly
                                      element.classList.add('ring-2', 'ring-accent-500', 'ring-offset-2', 'transition-all')
                                      setTimeout(() => {
                                        element.classList.remove('ring-2', 'ring-accent-500', 'ring-offset-2')
                                      }, 2000)
                                    } else {
                                      // If element not found, try again after a longer delay (page might still be loading)
                                      setTimeout(() => {
                                        const retryElement = document.getElementById(hash)
                                        if (retryElement) {
                                          retryElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                          retryElement.classList.add('ring-2', 'ring-accent-500', 'ring-offset-2', 'transition-all')
                                          setTimeout(() => {
                                            retryElement.classList.remove('ring-2', 'ring-accent-500', 'ring-offset-2')
                                          }, 2000)
                                        }
                                      }, 500)
                                    }
                                  }, 300)
                                }
                              }}
                              className={`block p-3 hover:bg-slate-700/50 transition-colors ${
                                !notification.isRead ? 'bg-slate-700/30' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${!notification.isRead ? 'text-white' : 'text-slate-300'}`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notification.message}</p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {new Date(notification.createdAt).toLocaleString()}
                                  </p>
                                </div>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-accent-600 rounded-full flex-shrink-0 mt-1"></div>
                                )}
                              </div>
                            </Link>
                            )
                          })}
                        </div>
                      )}
                      <div className="p-2 border-t border-slate-700/50 bg-slate-800/80">
                        <Link
                          href="/driver/notifications"
                          onClick={() => setNotificationDropdownOpen(false)}
                          className="block text-center text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                        >
                          View All Notifications
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className={`px-5 py-3 rounded-lg text-base font-medium transition-base flex items-center gap-2 ${
                    pathname?.startsWith('/driver/profile') || pathname?.startsWith('/driver/vehicle') || pathname?.startsWith('/driver/settings')
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                  <svg className={`w-5 h-5 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[45] md:left-64" onClick={() => setProfileDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-xl rounded-lg shadow-xl z-[60] border border-slate-700/50 overflow-hidden">
                      <Link
                        href="/driver/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`block px-4 py-3 text-sm transition-base font-medium ${
                          pathname?.startsWith('/driver/profile')
                            ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                            : 'text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          My Profile
                        </div>
                      </Link>
                      <Link
                        href="/driver/vehicle"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`block px-4 py-3 text-sm transition-base font-medium border-t border-slate-700/50 ${
                          pathname?.startsWith('/driver/vehicle')
                            ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                            : 'text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                          </svg>
                          My Vehicles
                        </div>
                      </Link>
                      <Link
                        href="/driver/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`block px-4 py-3 text-sm transition-base font-medium border-t border-slate-700/50 ${
                          pathname?.startsWith('/driver/settings')
                            ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                            : 'text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Settings
                        </div>
                      </Link>
                      <button
                        onClick={async () => {
                          try {
                            // Call logout API to clear httpOnly cookie
                            await fetch('/api/auth/logout', { method: 'POST' })
                          } catch (error) {
                            console.error('Error during logout:', error)
                          }
                          // Clear local state and preferences (non-auth data)
                          localStorage.removeItem('driverAdminMode')
                          localStorage.removeItem('driverNotificationPreferences')
                          setDriver(null)
                          setProfileDropdownOpen(false)
                          router.push('/driver/login')
                        }}
                        className="w-full block px-4 py-3 text-sm text-slate-300 hover:bg-red-900/20 hover:text-red-300 transition-base border-t border-slate-700/50 text-left font-medium"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Sidebar - Fixed full height - Hidden on mobile */}
      <aside className="hidden md:block fixed left-0 top-[85px] w-64 bg-slate-800/80 backdrop-blur-xl border-r border-slate-700/50 z-[55]" style={{ height: 'calc(100vh - 85px)' }}>
        <div className="flex flex-col h-full overflow-y-auto relative z-[55]">
          {/* Navigation */}
          <nav className="flex-1 p-4 pt-8 space-y-2">
            {/* Driver Navigation */}
            {navigation.map((item) => {
              // Check if current path matches the nav item
              const isActive =
                pathname === item.href ||
                (item.href === '/driver/dashboard' && pathname.startsWith('/driver/dashboard')) ||
                (item.href === '/driver/profile' && pathname.startsWith('/driver/profile')) ||
                (item.href === '/driver/documents' && pathname.startsWith('/driver/documents')) ||
                (item.href === '/driver/earnings' && pathname.startsWith('/driver/earnings')) ||
                (item.href === '/driver/shippers' && pathname.startsWith('/driver/shippers')) ||
                (item.href === '/driver/support' && pathname.startsWith('/driver/support')) ||
                (item.href === '/driver/loads' && pathname.startsWith('/driver/loads')) ||
                (item.href === '/driver/callback-queue' && pathname.startsWith('/driver/callback-queue')) ||
                (item.href === '/driver/scheduler' && pathname.startsWith('/driver/scheduler'))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-base relative ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                      : (item as any).highlight
                      ? 'bg-cyan-900/20 text-cyan-300 hover:bg-cyan-900/30 border-2 border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                  {(item as any).highlight && !isActive && (
                    <span className="ml-auto px-2 py-0.5 bg-accent-600 text-white text-xs font-bold rounded-full">New</span>
                  )}
                  {/* Pending callback count badge - only show if there are pending callbacks */}
                  {item.href === '/driver/callback-queue' && pendingCallbackCount > 0 && (
                    <span className={`ml-auto flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-bold ${
                      isActive 
                        ? 'bg-white/20 text-white border-2 border-white/30' 
                        : 'bg-red-600 text-white border-2 border-red-700 shadow-lg'
                    }`}>
                      {pendingCallbackCount > 99 ? '99+' : pendingCallbackCount}
                    </span>
                  )}
                </Link>
              )
            })}
            
            {/* Admin Navigation Separator */}
            {((adminModeEnabled && driver?.isAdmin) || hasBusinessAccess) && (
              <>
                <div className="my-4 border-t border-slate-700/50"></div>
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</p>
                </div>
                {adminNavigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/driver/admin' && pathname?.startsWith(item.href))
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-base ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30'
                          : 'text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  )
                })}
              </>
            )}
          </nav>

          {/* Support */}
          <div className="p-4 border-t border-slate-700/50">
            <Link
              href="/driver/support"
              className={`w-full px-4 py-2 rounded-lg text-sm transition-base font-medium flex items-center justify-center gap-2 ${
                pathname === '/driver/support' || pathname?.startsWith('/driver/support')
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Support
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content - Offset for fixed sidebar on desktop, full width on mobile */}
      <main className="md:ml-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 min-h-screen pb-16 md:pb-0 pt-[85px]">
        <div className="min-h-[calc(100vh-85px)]">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        items={[
          {
            name: 'Dashboard',
            href: '/driver/dashboard',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            ),
            activeIcon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            ),
          },
          {
            name: 'Scheduler',
            href: '/driver/scheduler',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ),
            activeIcon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ),
          },
          {
            name: 'My Loads',
            href: '/driver/my-loads',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            ),
            activeIcon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            ),
          },
          {
            name: 'Earnings',
            href: '/driver/earnings',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            activeIcon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            name: 'Profile',
            href: '/driver/profile',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ),
            activeIcon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  )
}
