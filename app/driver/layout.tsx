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
      name: 'My Profile',
      href: '/driver/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/30 flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/30">
            <Link href="/driver/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <Image src="/logo-icon.png" alt="MED DROP Logo" width={40} height={40} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gradient">MED DROP</h1>
                <p className="text-xs text-gray-600">Driver Portal</p>
              </div>
            </Link>
          </div>

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

          {/* User Info / Logout */}
          <div className="p-4 border-t border-white/30">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-slate-700 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {driver?.firstName?.charAt(0).toUpperCase() || 'D'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {driver?.firstName} {driver?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{driver?.email || ''}</p>
                {driver?.vehiclePlate && (
                  <p className="text-xs text-gray-500 truncate">{driver.vehicleType} • {driver.vehiclePlate}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('driver')
                router.push('/driver/login')
              }}
              className="mt-2 w-full px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-white/40 transition-base font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
            <Link
              href="/"
              className="mt-2 w-full px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-white/40 transition-base font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Site
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-neutral-50 to-stone-50">
        {children}
      </main>
    </div>
  )
}

