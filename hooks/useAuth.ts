// Generic Authentication Hook
// Base hook for authentication utilities

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getDriver, getShipper, getAdmin } from '@/lib/storage'
import { AUTH_ROUTES, PUBLIC_ROUTES } from '@/lib/constants'

export type UserType = 'driver' | 'shipper' | 'admin'

interface UseAuthOptions {
  userType: UserType
  redirectTo?: string
  requireAuth?: boolean
}

/**
 * Generic authentication hook
 * Handles auth state and redirects
 */
export function useAuth(options: UseAuthOptions) {
  const { userType, redirectTo, requireAuth = true } = options
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Don't check auth on public routes
    if (PUBLIC_ROUTES.includes(pathname) || AUTH_ROUTES.includes(pathname)) {
      setIsLoading(false)
      return
    }

    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    // Get user based on type
    let userData: any = null
    try {
      switch (userType) {
        case 'driver':
          userData = getDriver()
          break
        case 'shipper':
          userData = getShipper()
          break
        case 'admin':
          userData = getAdmin()
          break
      }

      if (userData) {
        setUser(userData)
        setIsLoading(false)
      } else if (requireAuth) {
        // Redirect to login if not authenticated
        const loginPath = redirectTo || `/${userType}/login`
        if (pathname !== loginPath) {
          router.push(loginPath)
        }
        setIsLoading(false)
      } else {
        setIsLoading(false)
      }
    } catch (error) {
      console.error(`Error checking ${userType} auth:`, error)
      setIsLoading(false)
      if (requireAuth) {
        const loginPath = redirectTo || `/${userType}/login`
        router.push(loginPath)
      }
    }
  }, [pathname, router, userType, redirectTo, requireAuth])

  return { user, isLoading, isAuthenticated: !!user }
}



