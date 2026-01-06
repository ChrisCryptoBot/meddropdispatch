import { NextRequest } from 'next/server'
import { prisma } from './prisma'

/**
 * Get authenticated admin user from request
 * Checks for admin session/cookie
 * 
 * Returns null if not authenticated or not admin
 */
export async function getAdminUser(request: NextRequest): Promise<{ id: string; email: string; role: string } | null> {
  try {
    // Check for admin session in cookie or header
    // For now, we'll check the Authorization header or cookie
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('cookie')
    
    // Try to get admin ID from cookie or header
    let adminId: string | null = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // If using Bearer token, extract admin ID
      // For now, we'll use a simple approach with localStorage on client
      // In production, use proper JWT tokens
      adminId = authHeader.replace('Bearer ', '')
    }
    
    // Alternative: Check for admin in cookie
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)
      
      if (cookies['admin-id']) {
        adminId = cookies['admin-id']
      }
    }
    
    // For now, since we're using localStorage on client side,
    // we'll need to pass admin info in a custom header from the frontend
    // Or use a session-based approach
    
    // This is a placeholder - in production, use proper session management
    return null
  } catch (error) {
    console.error('Error getting admin user:', error)
    return null
  }
}

/**
 * Verify admin role from request headers
 * This is a simplified version that checks a custom header
 * In production, use proper session/JWT tokens
 */
export async function verifyAdminRole(request: NextRequest): Promise<boolean> {
  // Check for admin role in custom header (set by frontend)
  const adminRole = request.headers.get('x-admin-role')
  const adminId = request.headers.get('x-admin-id')
  
  if (adminRole === 'ADMIN' || adminRole === 'DISPATCHER') {
    // Verify user exists and has admin role
    if (adminId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: adminId },
          select: { id: true, role: true }
        })
        
        if (user && (user.role === 'ADMIN' || user.role === 'DISPATCHER')) {
          return true
        }
      } catch (error) {
        console.error('Error verifying admin:', error)
      }
    }
  }
  
  return false
}

/**
 * Get admin user from localStorage (client-side helper)
 * This is used by the frontend to get admin info for API calls
 */
export function getAdminFromStorage(): { id: string; email: string; role: string } | null {
  if (typeof window === 'undefined') return null
  
  try {
    const adminData = localStorage.getItem('admin')
    if (adminData) {
      return JSON.parse(adminData)
    }
  } catch (error) {
    console.error('Error getting admin from storage:', error)
  }
  
  return null
}










