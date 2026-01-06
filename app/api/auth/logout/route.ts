import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth-session'

/**
 * POST /api/auth/logout
 * Logout user by clearing auth cookie
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  await clearAuthCookie(response)
  return response
}

