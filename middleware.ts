import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthSession } from '@/lib/auth-session'

/**
 * Middleware for route protection
 * Protects driver, shipper, and admin routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Safely get session - if it fails, treat as no session
  let session = null
  try {
    session = await getAuthSession(request)
  } catch (error) {
    console.error('Error getting auth session in middleware:', error)
    // Continue without session - user will need to log in
    session = null
  }

  // Driver routes
  if (pathname.startsWith('/driver')) {
    // Allow access to login and signup pages
    if (pathname === '/driver/login' || pathname === '/driver/signup') {
      // If already logged in, redirect to dashboard
      if (session && session.userType === 'driver') {
        return NextResponse.redirect(new URL('/driver/dashboard', request.url))
      }
      return NextResponse.next()
    }

    // Require authentication for all other driver routes
    if (!session || session.userType !== 'driver') {
      const loginUrl = new URL('/driver/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Shipper routes
  if (pathname.startsWith('/shipper')) {
    // Allow access to login and signup pages
    if (pathname === '/shipper/login' || pathname === '/shipper/signup') {
      // If already logged in, redirect to dashboard
      if (session && session.userType === 'shipper') {
        return NextResponse.redirect(new URL('/shipper/dashboard', request.url))
      }
      return NextResponse.next()
    }

    // Require authentication for all other shipper routes
    if (!session || session.userType !== 'shipper') {
      const loginUrl = new URL('/shipper/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Admin routes
  if (pathname.startsWith('/admin')) {
    // Allow access to login page
    if (pathname === '/admin/login') {
      // If already logged in, redirect to dashboard
      if (session && session.userType === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return NextResponse.next()
    }

    // Require authentication for all other admin routes
    if (!session || session.userType !== 'admin') {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/driver/:path*',
    '/shipper/:path*',
    '/admin/:path*',
  ],
}

