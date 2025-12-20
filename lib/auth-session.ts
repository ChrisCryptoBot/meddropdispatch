// Authentication Session Management with httpOnly Cookies
// This replaces localStorage-based authentication for better security

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export interface AuthSession {
  userId: string
  userType: 'driver' | 'shipper' | 'admin'
  email: string
  expiresAt: string // ISO string for serialization
}

const SESSION_COOKIE_NAME = 'auth_session'
const SESSION_DURATION_DAYS = 7

/**
 * Set authentication cookie in response
 * Used in API routes (server-side)
 */
export async function setAuthCookie(
  response: NextResponse,
  session: Omit<AuthSession, 'expiresAt'>
): Promise<NextResponse> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  const sessionData: AuthSession = {
    ...session,
    expiresAt: expiresAt.toISOString(),
  }

  response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return response
}

/**
 * Get authentication session from request cookies
 * Used in API routes and middleware (server-side)
 */
export async function getAuthSession(
  request: NextRequest
): Promise<AuthSession | null> {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)
  if (!cookie) return null

  try {
    const session = JSON.parse(cookie.value) as AuthSession
    const expiresAt = new Date(session.expiresAt)
    
    if (expiresAt < new Date()) {
      return null // Session expired
    }
    
    return session
  } catch {
    return null // Invalid cookie format
  }
}

/**
 * Get authentication session from server-side cookies
 * Used in server components
 */
export async function getAuthSessionFromCookies(): Promise<AuthSession | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)
  if (!cookie) return null

  try {
    const session = JSON.parse(cookie.value) as AuthSession
    const expiresAt = new Date(session.expiresAt)
    
    if (expiresAt < new Date()) {
      return null // Session expired
    }
    
    return session
  } catch {
    return null // Invalid cookie format
  }
}

/**
 * Clear authentication cookie
 */
export async function clearAuthCookie(
  response: NextResponse
): Promise<NextResponse> {
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}

/**
 * Verify session and return user data
 * Used to get current authenticated user in API routes
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{
  userId: string
  userType: 'driver' | 'shipper' | 'admin'
  email: string
} | null> {
  const session = await getAuthSession(request)
  if (!session) return null

  return {
    userId: session.userId,
    userType: session.userType,
    email: session.email,
  }
}

