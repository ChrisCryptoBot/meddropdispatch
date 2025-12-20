import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Edge-compatible session reading from cookies
 * Middleware runs in Edge Runtime, so we can't use Node.js APIs
 */
function getSessionFromRequest(request: NextRequest): { userId: string; userType: 'driver' | 'shipper' | 'admin'; email: string } | null {
  const sessionCookie = request.cookies.get('auth_session')
  
  if (!sessionCookie?.value) {
    return null
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    
    // Check if session is expired
    if (session.expiresAt) {
      const expiresAt = new Date(session.expiresAt)
      if (expiresAt < new Date()) {
        return null
      }
    }
    
    return {
      userId: session.userId,
      userType: session.userType,
      email: session.email,
    }
  } catch (error) {
    return null
  }
}

/**
 * Middleware for route protection
 * Protects driver, shipper, and admin routes
 * Runs in Edge Runtime - must be Edge-compatible
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get session from cookies (Edge-compatible)
  const session = getSessionFromRequest(request)

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

