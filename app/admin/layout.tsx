'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import MobileBottomNav from '@/components/features/MobileBottomNav'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [admin, setAdmin] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const authCheckedRef = useRef(false)

  useEffect(() => {
    // Don't check auth on login page
    if (pathname === '/admin/login') {
      setIsChecking(false)
      authCheckedRef.current = false
      return
    }

    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    // Skip if we've already checked auth and have an admin (unless navigating to a new protected route)
    if (authCheckedRef.current && admin) {
      setIsChecking(false)
      return
    }

    // Check authentication via API (httpOnly cookies) - fallback to localStorage
    const checkAuth = async () => {
      try {
        // First try API check
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        const data = await response.json()

        if (data.authenticated && data.user && data.user.userType === 'admin') {
          setAdmin(data.user)
          setIsChecking(false)
          authCheckedRef.current = true
        } else {
          // Fallback to localStorage
          const adminData = localStorage.getItem('admin')
          if (adminData) {
            setAdmin(JSON.parse(adminData))
            setIsChecking(false)
            authCheckedRef.current = true
          } else {
            setAdmin(null)
            setIsChecking(false)
            authCheckedRef.current = false
            if (pathname !== '/admin/login') {
              router.push('/admin/login')
            }
          }
        }
      } catch (error) {
        // Fallback to localStorage on error
        try {
          const adminData = localStorage.getItem('admin')
          if (adminData) {
            setAdmin(JSON.parse(adminData))
            setIsChecking(false)
            authCheckedRef.current = true
          } else {
            setAdmin(null)
            setIsChecking(false)
            authCheckedRef.current = false
            if (pathname !== '/admin/login') {
              router.push('/admin/login')
            }
          }
        } catch (localError) {
          console.error('Error checking admin auth:', localError)
          setAdmin(null)
          setIsChecking(false)
          authCheckedRef.current = false
          if (pathname !== '/admin/login') {
            router.push('/admin/login')
          }
        }
      }
    }

    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Close dropdown when route changes
  useEffect(() => {
    setProfileDropdownOpen(false)
  }, [pathname])

  // Show loading while checking auth
  if (isChecking && pathname !== '/admin/login') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't show layout on login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Load Requests',
      href: '/admin/loads',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Shippers',
      href: '/admin/shippers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: 'Compliance',
      href: '/admin/compliance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      name: 'Driver Approvals',
      href: '/admin/drivers/pending',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Brokerage Shippers',
      href: '/admin/shippers/brokerage',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Blocked Emails',
      href: '/admin/blocked-emails',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
    {
      name: 'Fleet Maintenance',
      href: '/admin/fleet/maintenance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header - Gold Standard */}
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
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className={`px-5 py-3 rounded-lg text-base font-medium transition-base flex items-center gap-2 ${
                    pathname?.startsWith('/admin/settings')
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {admin?.name || 'Admin'}
                  <svg className={`w-5 h-5 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[45] md:left-64" onClick={() => setProfileDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-xl rounded-lg shadow-xl z-[60] border border-slate-700/50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-700/50">
                        <p className="text-sm font-semibold text-white">{admin?.name || 'Admin User'}</p>
                        <p className="text-xs text-slate-400">{admin?.email || ''}</p>
                        <p className="text-xs text-slate-500 mt-1">{admin?.role || 'Administrator'}</p>
                      </div>
                      <Link
                        href="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block px-4 py-3 text-sm transition-base font-medium text-slate-300 hover:bg-slate-700/50"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          Dashboard
                        </div>
                      </Link>
                      <button
                        onClick={async () => {
                          try {
                            await fetch('/api/auth/logout', { method: 'POST' })
                          } catch (error) {
                            console.error('Error during logout:', error)
                          }
                          localStorage.removeItem('admin')
                          setAdmin(null)
                          setProfileDropdownOpen(false)
                          router.push('/admin/login')
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

      {/* Sidebar - Fixed full height - Hidden on mobile - Gold Standard */}
      <aside className="hidden md:block fixed left-0 top-[85px] w-64 bg-slate-800/80 backdrop-blur-xl border-r border-slate-700/50 z-[55]" style={{ height: 'calc(100vh - 85px)' }}>
        <div className="flex flex-col h-full overflow-y-auto relative z-[55]">
          {/* Navigation */}
          <nav className="flex-1 p-4 pt-8 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-base relative ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/50">
            <Link
              href="/"
              className="w-full px-4 py-2 rounded-lg text-sm transition-base font-medium flex items-center justify-center gap-2 text-slate-300 hover:bg-slate-700/50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Site
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content - Offset for fixed sidebar on desktop, full width on mobile - Gold Standard */}
      <main className="flex-1 overflow-y-auto pt-[85px] md:pl-64">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        items={[
          {
            name: 'Dashboard',
            href: '/admin',
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
            name: 'Loads',
            href: '/admin/loads',
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
            name: 'Shippers',
            href: '/admin/shippers',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            ),
            activeIcon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            ),
          },
          {
            name: 'Analytics',
            href: '/admin/analytics',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
            activeIcon: (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
          },
          {
            name: 'More',
            href: '/admin/compliance',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  )
}
