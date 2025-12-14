'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import MobileBottomNav from '@/components/features/MobileBottomNav'

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
  const [shouldShake, setShouldShake] = useState(false)
  const [lastNotificationCount, setLastNotificationCount] = useState(0)
  const [pendingCallbackCount, setPendingCallbackCount] = useState(0)

  useEffect(() => {
    // Don't check auth on login or signup pages
    if (pathname === '/driver/login' || pathname === '/driver/signup') {
      setIsChecking(false)
      return
    }

    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    // Check if driver is logged in
    try {
      const driverData = localStorage.getItem('driver')
      if (driverData) {
        setDriver(JSON.parse(driverData))
        setIsChecking(false)
      } else {
        // Only redirect if we're not already on login/signup page
        if (pathname !== '/driver/login' && pathname !== '/driver/signup') {
          router.push('/driver/login')
        }
      }
    } catch (error) {
      console.error('Error checking driver auth:', error)
      setIsChecking(false)
      if (pathname !== '/driver/login' && pathname !== '/driver/signup') {
        router.push('/driver/login')
      }
    }
  }, [pathname, router])

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
          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }

    fetchNotifications()
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
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

  // Show loading while checking auth
  if (isChecking && pathname !== '/driver/login' && pathname !== '/driver/signup') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't show layout on login/signup pages
  if (pathname === '/driver/login' || pathname === '/driver/signup') {
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
      name: 'Earnings',
      href: '/driver/earnings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Same as Homepage */}
      <header className="glass-accent sticky top-0 z-50 border-b border-teal-200/30 flex-shrink-0">
        <div className="w-full py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 pl-4 md:pl-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <Image
                  src="/logo-icon.png"
                  alt="MED DROP Logo"
                  width={64}
                  height={64}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gradient">MED DROP</h1>
                <p className="text-sm font-semibold text-red-600">Medical Courier Services</p>
              </div>
            </div>
            <nav className="flex items-center space-x-3 pr-4">
              <div className="relative">
                <button
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                  className={`p-3 rounded-lg transition-base relative ${
                    notificationDropdownOpen
                      ? 'bg-gradient-accent text-white shadow-medical'
                      : 'text-gray-700 hover:bg-teal-50/60'
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
                    <div className="fixed inset-0 z-10" onClick={() => setNotificationDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-80 glass-accent rounded-lg shadow-medical z-20 border-2 border-teal-200/30 overflow-hidden max-h-96 overflow-y-auto">
                      <div className="p-3 border-b border-teal-200/30 bg-teal-50/60">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-gray-600 text-sm">No notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-teal-200/30">
                          {notifications.map((notification) => (
                            <Link
                              key={notification.id}
                              href={notification.link || '/driver/notifications'}
                              onClick={async (e) => {
                                e.preventDefault()
                                setNotificationDropdownOpen(false)
                                
                                // Mark as read via API
                                if (!notification.isRead && driver?.id) {
                                  try {
                                    await fetch(`/api/drivers/${driver.id}/notifications`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ notificationIds: [notification.id] }),
                                    })
                                    
                                    // Update local state: mark as read and remove from dropdown
                                    setNotifications(prev => 
                                      prev.filter(n => n.id !== notification.id)
                                    )
                                    setUnreadCount(prev => Math.max(0, prev - 1))
                                  } catch (error) {
                                    console.error('Error marking notification as read:', error)
                                  }
                                } else {
                                  // Even if already read, remove from dropdown
                                  setNotifications(prev => 
                                    prev.filter(n => n.id !== notification.id)
                                  )
                                }
                                
                                // Navigate to the link
                                if (notification.link) {
                                  router.push(notification.link)
                                } else {
                                  router.push('/driver/notifications')
                                }
                              }}
                              className={`block p-3 hover:bg-teal-50/60 transition-colors ${
                                !notification.isRead ? 'bg-teal-50/40' : ''
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notification.createdAt).toLocaleString()}
                                  </p>
                                </div>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-accent-600 rounded-full flex-shrink-0 mt-1"></div>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      <div className="p-2 border-t border-teal-200/30 bg-teal-50/60">
                        <Link
                          href="/driver/notifications"
                          onClick={() => setNotificationDropdownOpen(false)}
                          className="block text-center text-sm text-accent-700 hover:text-accent-800 font-medium"
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
                    pathname?.startsWith('/driver/profile') || pathname?.startsWith('/driver/vehicle')
                      ? 'bg-gradient-accent text-white shadow-medical'
                      : 'text-gray-700 hover:bg-teal-50/60'
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
                    <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 glass-accent rounded-lg shadow-medical z-20 border-2 border-teal-200/30 overflow-hidden">
                      <Link
                        href="/driver/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`block px-4 py-3 text-sm transition-base font-medium ${
                          pathname?.startsWith('/driver/profile')
                            ? 'bg-gradient-accent text-white shadow-medical'
                            : 'text-accent-700 hover:bg-teal-50/60'
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
                        className={`block px-4 py-3 text-sm transition-base font-medium border-t border-teal-200/30 ${
                          pathname?.startsWith('/driver/vehicle')
                            ? 'bg-gradient-accent text-white shadow-medical'
                            : 'text-accent-700 hover:bg-teal-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                          </svg>
                          My Vehicles
                        </div>
                      </Link>
                      <button
                        onClick={() => {
                          localStorage.removeItem('driver')
                          setProfileDropdownOpen(false)
                          router.push('/driver/login')
                        }}
                        className="w-full block px-4 py-3 text-sm text-accent-700 hover:bg-urgent-50/60 hover:text-urgent-700 transition-base border-t border-teal-200/30 text-left font-medium"
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
      <aside className="hidden md:block fixed left-0 top-[73px] w-64 glass-accent border-r border-teal-200/30 z-40" style={{ height: 'calc(100vh - 73px)' }}>
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Navigation */}
          <nav className="flex-1 p-4 pt-8 space-y-2">
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
                      ? 'bg-gradient-accent text-white shadow-lg'
                      : item.highlight
                      ? 'bg-accent-50 text-accent-700 hover:bg-accent-100 border-2 border-accent-200'
                      : 'text-gray-700 hover:bg-teal-50/60'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                  {item.highlight && !isActive && (
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
          </nav>

          {/* Support */}
          <div className="p-4 border-t border-teal-200/30">
            <Link
              href="/driver/support"
              className={`w-full px-4 py-2 rounded-lg text-sm transition-base font-medium flex items-center justify-center gap-2 ${
                pathname === '/driver/support' || pathname?.startsWith('/driver/support')
                  ? 'bg-gradient-accent text-white shadow-lg'
                  : 'text-gray-700 hover:bg-teal-50/60'
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
      <main className="md:ml-64 bg-gradient-medical-bg min-h-screen pb-16 md:pb-0 pt-[73px]">
        {children}
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

