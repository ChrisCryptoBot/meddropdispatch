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
 * Lightweight rate limiter for public tracking pages (Edge-compatible)
 * Note: In-memory storage is per-edge-instance and best-effort only.
 */
const trackingRateStore: Map<string, { count: number; reset: number }> = new Map()
const TRACK_WINDOW_MS = 60_000
const TRACK_MAX_REQ = 30

function rateLimitTracking(request: NextRequest): boolean {
  try {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = (forwarded?.split(',')[0] || realIp || 'unknown').trim()
    const ua = (request.headers.get('user-agent') || 'unknown').slice(0, 64)
    const key = `track:${ip}:${ua}`
    const now = Date.now()
    const rec = trackingRateStore.get(key)
    if (!rec || rec.reset < now) {
      trackingRateStore.set(key, { count: 1, reset: now + TRACK_WINDOW_MS })
      return true
    }
    rec.count += 1
    if (rec.count > TRACK_MAX_REQ) {
      return false
    }
    return true
  } catch {
    // Fail open on unexpected errors
    return true
  }
}

/**
 * Middleware for route protection
 * Protects driver, shipper, and admin routes
 * Runs in Edge Runtime - must be Edge-compatible
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public tracking page rate-limiting
  if (pathname.startsWith('/track')) {
    const allowed = rateLimitTracking(request)
    if (!allowed) {
      return new NextResponse('Too many requests. Please slow down.', { status: 429 })
    }
  }

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

