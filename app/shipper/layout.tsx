'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import MobileBottomNav from '@/components/features/MobileBottomNav'

export default function ShipperLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Don't check auth on login or signup pages
    if (pathname === '/shipper/login' || pathname === '/shipper/signup') {
      setIsChecking(false)
      return
    }

    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    // Check if shipper is logged in
    try {
      const shipperData = localStorage.getItem('shipper')
      if (shipperData) {
        setShipper(JSON.parse(shipperData))
        setIsChecking(false)
      } else {
        // Only redirect if we're not already on login or signup page
        if (pathname !== '/shipper/login' && pathname !== '/shipper/signup') {
          router.push('/shipper/login')
        }
      }
    } catch (error) {
      console.error('Error checking shipper auth:', error)
      setIsChecking(false)
      if (pathname !== '/shipper/login' && pathname !== '/shipper/signup') {
        router.push('/shipper/login')
      }
    }
  }, [pathname, router])

  // Close dropdown when route changes
  useEffect(() => {
    setProfileDropdownOpen(false)
    setNotificationDropdownOpen(false)
  }, [pathname])

  // Fetch notifications (placeholder - shipper notifications API may need to be created)
  useEffect(() => {
    if (!shipper?.id) return

    const fetchNotifications = async () => {
      try {
        // TODO: Create shipper notifications API endpoint
        // For now, using empty array
        setNotifications([])
        setUnreadCount(0)
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [shipper?.id])

  // Show loading while checking auth
  if (isChecking && pathname !== '/shipper/login' && pathname !== '/shipper/signup') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't show layout on login or signup pages
  if (pathname === '/shipper/login' || pathname === '/shipper/signup') {
    return <>{children}</>
  }

  const navigation = [
    {
      name: 'Request Load',
      href: '/shipper/request-load',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      highlight: true,
    },
    {
      name: 'My Loads',
      href: '/shipper/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Facilities',
      href: '/shipper/facilities',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      name: 'Tracking',
      href: '/shipper/tracking',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      name: 'Documents',
      href: '/shipper/documents',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Invoices',
      href: '/shipper/invoices',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm5 5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Same as Homepage */}
      <header className="glass-primary sticky top-0 z-50 border-b border-blue-200/30 flex-shrink-0">
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
                      ? 'bg-gradient-primary text-white shadow-lg'
                      : 'text-gray-700 hover:bg-blue-50/60'
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
                    <div className="absolute right-0 mt-2 w-80 glass-primary rounded-lg shadow-glass z-20 border-2 border-blue-200/30 overflow-hidden max-h-96 overflow-y-auto">
                      <div className="p-3 border-b border-blue-200/30 bg-blue-50/60">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-gray-600 text-sm">No notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-blue-200/30">
                          {notifications.map((notification) => (
                            <Link
                              key={notification.id}
                              href={notification.link || '/shipper/notifications'}
                              onClick={async (e) => {
                                e.preventDefault()
                                setNotificationDropdownOpen(false)
                                
                                // Mark as read via API
                                if (!notification.isRead && shipper?.id) {
                                  try {
                                    await fetch(`/api/shippers/${shipper.id}/notifications`, {
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
                                  router.push('/shipper/notifications')
                                }
                              }}
                              className={`block p-3 hover:bg-blue-50/60 transition-colors ${
                                !notification.isRead ? 'bg-blue-50/40' : ''
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
                                  <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-1"></div>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      <div className="p-2 border-t border-blue-200/30 bg-blue-50/60">
                        <Link
                          href="/shipper/notifications"
                          onClick={() => setNotificationDropdownOpen(false)}
                          className="block text-center text-sm text-primary-700 hover:text-primary-800 font-medium"
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
                    pathname?.startsWith('/shipper/settings') || pathname?.startsWith('/shipper/billing') || pathname?.startsWith('/shipper/security')
                      ? 'bg-gradient-primary text-white shadow-lg'
                      : 'text-gray-700 hover:bg-blue-50/60'
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
                    <div className="absolute right-0 mt-2 w-56 glass-primary rounded-lg shadow-glass z-20 border-2 border-blue-200/30 overflow-hidden">
                      <Link
                        href="/shipper/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`block px-4 py-3 text-sm transition-base font-medium ${
                          pathname?.startsWith('/shipper/settings')
                            ? 'bg-gradient-primary text-white shadow-lg'
                            : 'text-primary-700 hover:bg-blue-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Account Settings
                        </div>
                      </Link>
                      {/* Temporarily hidden until billing page is built */}
                      {/* <Link
                        href="/shipper/billing"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`block px-4 py-3 text-sm transition-base font-medium border-t border-blue-200/30 ${
                          pathname?.startsWith('/shipper/billing')
                            ? 'bg-gradient-primary text-white shadow-lg'
                            : 'text-primary-700 hover:bg-blue-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Billing & Payments
                        </div>
                      </Link> */}
                      {/* Temporarily hidden until security page is built */}
                      {/* <Link
                        href="/shipper/security"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`block px-4 py-3 text-sm transition-base font-medium border-t border-blue-200/30 ${
                          pathname?.startsWith('/shipper/security')
                            ? 'bg-gradient-primary text-white shadow-lg'
                            : 'text-primary-700 hover:bg-blue-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Security
                        </div>
                      </Link> */}
                      <button
                        onClick={() => {
                          localStorage.removeItem('shipper')
                          setProfileDropdownOpen(false)
                          router.push('/shipper/login')
                        }}
                        className="w-full block px-4 py-3 text-sm text-primary-700 hover:bg-urgent-50/60 hover:text-urgent-700 transition-base border-t border-blue-200/30 text-left font-medium"
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
      <aside className="hidden md:block fixed left-0 top-[73px] w-64 glass-primary border-r border-blue-200/30 z-40" style={{ height: 'calc(100vh - 73px)' }}>
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Navigation */}
          <nav className="flex-1 p-4 pt-8 space-y-2">
            {navigation.map((item) => {
              // Check if current path matches the nav item
              const isActive = 
                pathname === item.href || 
                (item.href === '/shipper/dashboard' && pathname.startsWith('/shipper/dashboard')) ||
                (item.href === '/shipper/documents' && pathname.startsWith('/shipper/documents')) ||
                (item.href === '/shipper/invoices' && pathname.startsWith('/shipper/invoices')) ||
                (item.href === '/shipper/settings' && pathname.startsWith('/shipper/settings')) ||
                (item.href === '/shipper/support' && pathname.startsWith('/shipper/support')) ||
                (item.href === '/shipper/loads' && pathname.startsWith('/shipper/loads')) ||
                (item.href === '/shipper/tracking' && pathname.startsWith('/shipper/tracking')) ||
                (item.href === '/shipper/facilities' && pathname.startsWith('/shipper/facilities')) ||
                (item.href === '/shipper/request-load' && pathname.startsWith('/shipper/request-load'))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-base ${
                        isActive
                          ? 'bg-gradient-primary text-white shadow-lg'
                          : item.highlight
                          ? 'bg-primary-50 text-primary-700 hover:bg-primary-100 border-2 border-primary-200'
                          : 'text-gray-700 hover:bg-blue-50/60'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                  {item.highlight && !isActive && (
                    <span className="ml-auto px-2 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full">New</span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Support */}
          <div className="p-4 border-t border-blue-200/30">
            <Link
              href="/shipper/support"
              className={`w-full px-4 py-3 rounded-lg text-sm transition-base font-medium flex items-center justify-center gap-2 ${
                pathname === '/shipper/support' || pathname?.startsWith('/shipper/support')
                  ? 'bg-gradient-primary text-white shadow-lg'
                  : 'text-gray-700 hover:bg-blue-50/60'
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
            name: 'Request',
            href: '/shipper/request-load',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            ),
          },
          {
            name: 'My Loads',
            href: '/shipper/dashboard',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            ),
          },
          {
            name: 'Facilities',
            href: '/shipper/facilities',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
          },
          {
            name: 'Tracking',
            href: '/shipper/tracking',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            name: 'Documents',
            href: '/shipper/documents',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ),
          },
          {
            name: 'Invoices',
            href: '/shipper/invoices',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
              </svg>
            ),
          },
          {
            name: 'Profile',
            href: '/shipper/settings',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  )
}

