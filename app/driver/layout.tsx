'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(true)

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

  // Show loading while checking auth
  if (isChecking && pathname !== '/driver/login' && pathname !== '/driver/signup') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
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
      name: 'Load Board',
      href: '/driver/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Documents',
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
      name: 'Support',
      href: '/driver/support',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Same as Homepage */}
      <header className="glass sticky top-0 z-50 border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <Image
                  src="/logo-icon.png"
                  alt="MED DROP Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">MED DROP</h1>
                <p className="text-xs text-gray-600">Medical Courier Services</p>
              </div>
            </div>
            <nav className="flex items-center space-x-4">
              <Link
                href="/driver/profile"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-base ${
                  pathname === '/driver/profile' || pathname?.startsWith('/driver/profile')
                    ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
                    : 'text-gray-700 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </div>
              </Link>
              <Link
                href="/driver/notifications"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-base relative ${
                  pathname === '/driver/notifications' || pathname?.startsWith('/driver/notifications')
                    ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
                    : 'text-gray-700 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Notifications
                </div>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 glass border-r border-white/30 flex-shrink-0 overflow-y-auto">
          <div className="flex flex-col h-full">
            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              // Check if current path matches the nav item
              const isActive =
                pathname === item.href ||
                (item.href === '/driver/dashboard' && pathname.startsWith('/driver/dashboard')) ||
                (item.href === '/driver/profile' && pathname.startsWith('/driver/profile')) ||
                (item.href === '/driver/documents' && pathname.startsWith('/driver/documents')) ||
                (item.href === '/driver/earnings' && pathname.startsWith('/driver/earnings')) ||
                (item.href === '/driver/support' && pathname.startsWith('/driver/support')) ||
                (item.href === '/driver/loads' && pathname.startsWith('/driver/loads'))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-base ${
                    isActive
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white/40'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-white/30">
              <button
                onClick={() => {
                  localStorage.removeItem('driver')
                  router.push('/driver/login')
                }}
                className="w-full px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-white/40 transition-base font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-neutral-50 to-stone-50">
          {children}
        </main>
      </div>
    </div>
  )
}

