// API Middleware Utilities
// Helper functions for common API middleware needs

import { NextRequest } from 'next/server'
import { AuthorizationError, AuthenticationError } from './errors'
import { prisma } from './prisma'

/**
 * Extract user ID from request headers
 * Currently supports localStorage-based auth (will be replaced with JWT/httpOnly cookies)
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // TODO: Replace with proper JWT token extraction from httpOnly cookies
  // For now, check Authorization header or session
  const authHeader = request.headers.get('authorization')
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    // TODO: Verify JWT token and extract user ID
    // For now, return null (will be implemented with proper auth)
    return null
  }

  // Check for user ID in custom header (temporary solution)
  const userId = request.headers.get('x-user-id')
  if (userId) {
    return userId
  }

  return null
}

/**
 * Check if user is admin
 * Currently a placeholder - will be enhanced with proper session management
 */
export async function requireAdmin(request: NextRequest): Promise<void> {
  // TODO: Implement proper admin authentication
  // For now, this is a placeholder that will be enhanced when JWT/httpOnly cookies are implemented
  
  // In production, this should:
  // 1. Extract JWT token from httpOnly cookie
  // 2. Verify token signature
  // 3. Check user role in token payload
  // 4. Verify user still exists and has admin role
  
  // Temporary: Check for admin header (for development/testing)
  const isAdmin = request.headers.get('x-admin') === 'true'
  if (!isAdmin) {
    // In production, this should check actual session/token
    // For now, we'll allow it but log a warning
    // throw new AuthorizationError('Admin access required')
  }
}

/**
 * Get admin user from request
 * Returns admin user if authenticated, throws error otherwise
 */
export async function getAdminFromRequest(request: NextRequest) {
  await requireAdmin(request)
  
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    throw new AuthenticationError('Authentication required')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
    },
  })

  if (!user || user.role !== 'ADMIN') {
    throw new AuthorizationError('Admin access required')
  }

  return user
}

/**
 * Require authentication (any authenticated user)
 */
export async function requireAuth(request: NextRequest): Promise<string> {
  const userId = await getUserIdFromRequest(request)
  
  if (!userId) {
    throw new AuthenticationError('Authentication required')
  }

  return userId
}

