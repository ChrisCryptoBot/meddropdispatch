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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

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
  }, [pathname])

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
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Same as Homepage */}
      <header className="glass sticky top-0 z-50 border-b border-white/30 flex-shrink-0">
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
            <nav className="flex items-center space-x-3">
              <Link
                href="/driver/notifications"
                className={`p-2 rounded-lg transition-base relative ${
                  pathname === '/driver/notifications' || pathname?.startsWith('/driver/notifications')
                    ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
                    : 'text-gray-700 hover:bg-white/60'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </Link>
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-base flex items-center gap-2 ${
                    pathname?.startsWith('/driver/settings') || pathname?.startsWith('/driver/vehicle') || pathname?.startsWith('/driver/payments') || pathname?.startsWith('/driver/security')
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
                      : 'text-gray-700 hover:bg-white/60'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                  <svg className={`w-4 h-4 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 glass rounded-lg shadow-lg z-20 border border-white/30 overflow-hidden">
                      <Link
                        href="/driver/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`block px-4 py-3 text-sm transition-base ${
                          pathname?.startsWith('/driver/settings')
                            ? 'bg-slate-600 text-white'
                            : 'text-gray-700 hover:bg-white/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Profile Settings
                        </div>
                      </Link>
                      <Link
                        href="/driver/vehicle"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`block px-4 py-3 text-sm transition-base border-t border-white/20 ${
                          pathname?.startsWith('/driver/vehicle')
                            ? 'bg-slate-600 text-white'
                            : 'text-gray-700 hover:bg-white/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                          </svg>
                          Vehicle Info
                        </div>
                      </Link>
                      <Link
                        href="/driver/payments"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`block px-4 py-3 text-sm transition-base border-t border-white/20 ${
                          pathname?.startsWith('/driver/payments')
                            ? 'bg-slate-600 text-white'
                            : 'text-gray-700 hover:bg-white/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Payments & Payouts
                        </div>
                      </Link>
                      <Link
                        href="/driver/security"
                        onClick={() => setProfileDropdownOpen(false)}
                        className={`block px-4 py-3 text-sm transition-base border-t border-white/20 ${
                          pathname?.startsWith('/driver/security')
                            ? 'bg-slate-600 text-white'
                            : 'text-gray-700 hover:bg-white/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Security
                        </div>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Sidebar - Fixed full height */}
      <aside className="fixed left-0 top-[73px] w-64 glass border-r border-white/30 z-40" style={{ height: 'calc(100vh - 73px)' }}>
        <div className="flex flex-col h-full overflow-y-auto">
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

          {/* Support & Logout */}
          <div className="p-4 border-t border-white/30 space-y-2">
            <Link
              href="/driver/support"
              className={`w-full px-4 py-2 rounded-lg text-sm transition-base font-medium flex items-center justify-center gap-2 ${
                pathname === '/driver/support' || pathname?.startsWith('/driver/support')
                  ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
                  : 'text-gray-700 hover:bg-white/40'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Support
            </Link>
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

      {/* Main Content - Offset for fixed sidebar */}
      <main className="ml-64 bg-gradient-to-br from-slate-50 via-neutral-50 to-stone-50 min-h-screen" style={{ marginTop: '73px' }}>
        {children}
      </main>
    </div>
  )
}

