// Authorization Utilities
// Provides helpers for verifying user permissions in API routes

import { NextRequest } from 'next/server'
import { getAuthSession } from './auth-session'
import { AuthorizationError } from './errors'
import { prisma } from './prisma'

export interface AuthContext {
  userId: string
  userType: 'driver' | 'shipper' | 'admin'
  email: string
}

/**
 * Get authenticated user from request
 * Throws AuthorizationError if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const session = await getAuthSession(request)
  
  if (!session) {
    throw new AuthorizationError('Authentication required')
  }

  return {
    userId: session.userId,
    userType: session.userType,
    email: session.email,
  }
}

/**
 * Require that the user is a driver
 */
export async function requireDriver(request: NextRequest): Promise<AuthContext> {
  const auth = await requireAuth(request)
  
  if (auth.userType !== 'driver') {
    throw new AuthorizationError('Driver access required')
  }

  return auth
}

/**
 * Require that the user is a shipper
 */
export async function requireShipper(request: NextRequest): Promise<AuthContext> {
  const auth = await requireAuth(request)
  
  if (auth.userType !== 'shipper') {
    throw new AuthorizationError('Shipper access required')
  }

  return auth
}

/**
 * Require that the user is an admin
 * Checks if user is admin user OR driver with isAdmin flag
 */
export async function requireAdmin(request: NextRequest): Promise<AuthContext> {
  const auth = await requireAuth(request)
  
  // Check if user is admin user (legacy)
  if (auth.userType === 'admin') {
    return auth
  }
  
  // Check if driver has admin privileges
  if (auth.userType === 'driver') {
    const driver = await prisma.driver.findUnique({
      where: { id: auth.userId },
    })
    
    if (driver && (driver as any).isAdmin) {
      return auth
    }
  }
  
  throw new AuthorizationError('Admin access required')
}

/**
 * Verify that a driver can only access their own resources
 * Throws AuthorizationError if driverId doesn't match authenticated driver
 */
export async function verifyDriverAccess(
  request: NextRequest,
  driverId: string
): Promise<void> {
  const auth = await requireDriver(request)
  
  if (auth.userId !== driverId) {
    throw new AuthorizationError('Access denied: Cannot access other driver resources')
  }
}

/**
 * Verify that a shipper can only access their own resources
 * Throws AuthorizationError if shipperId doesn't match authenticated shipper
 */
export async function verifyShipperAccess(
  request: NextRequest,
  shipperId: string
): Promise<void> {
  const auth = await requireShipper(request)
  
  if (auth.userId !== shipperId) {
    throw new AuthorizationError('Access denied: Cannot access other shipper resources')
  }
}

/**
 * Verify that a driver is assigned to a load
 * Throws AuthorizationError if driver is not assigned
 */
export async function verifyDriverAssignedToLoad(
  request: NextRequest,
  loadId: string
): Promise<void> {
  const auth = await requireDriver(request)
  
  const load = await prisma.loadRequest.findUnique({
    where: { id: loadId },
    select: { driverId: true },
  })

  if (!load) {
    throw new AuthorizationError('Load not found')
  }

  if (load.driverId !== auth.userId) {
    throw new AuthorizationError('Access denied: Driver is not assigned to this load')
  }
}

/**
 * Verify that a shipper owns a load
 * Throws AuthorizationError if shipper doesn't own the load
 */
export async function verifyShipperOwnsLoad(
  request: NextRequest,
  loadId: string
): Promise<void> {
  const auth = await requireShipper(request)
  
  const load = await prisma.loadRequest.findUnique({
    where: { id: loadId },
    select: { shipperId: true },
  })

  if (!load) {
    throw new AuthorizationError('Load not found')
  }

  if (load.shipperId !== auth.userId) {
    throw new AuthorizationError('Access denied: Shipper does not own this load')
  }
}

/**
 * Verify that user can update load status
 * Drivers can only update loads assigned to them
 * Admins can update any load
 */
export async function verifyLoadStatusUpdateAccess(
  request: NextRequest,
  loadId: string
): Promise<void> {
  const auth = await requireAuth(request)
  
  const load = await prisma.loadRequest.findUnique({
    where: { id: loadId },
    select: { driverId: true, shipperId: true },
  })

  if (!load) {
    throw new AuthorizationError('Load not found')
  }

  // Check if user is admin user (legacy) or admin driver
  if (auth.userType === 'admin') {
    return // Admins can update any load
  }

  if (auth.userType === 'driver') {
    // Check if driver has admin privileges
    const driver = await prisma.driver.findUnique({
      where: { id: auth.userId },
    })
    
    if (driver && (driver as any).isAdmin) {
      return // Admin drivers can update any load
    }
    
    // Regular drivers can only update their assigned loads
    if (load.driverId !== auth.userId) {
      throw new AuthorizationError('Access denied: Driver is not assigned to this load')
    }
    return
  }

  if (auth.userType === 'shipper') {
    // Shippers can only update status in limited cases (e.g., accept quote, cancel)
    // This is handled in specific endpoints
    if (load.shipperId !== auth.userId) {
      throw new AuthorizationError('Access denied: Shipper does not own this load')
    }
    return
  }

  throw new AuthorizationError('Access denied')
}

/**
 * Verify that user can upload documents to a load
 * Drivers can upload to loads assigned to them
 * Shippers can upload to their own loads
 * Admins can upload to any load
 */
export async function verifyDocumentUploadAccess(
  request: NextRequest,
  loadId: string
): Promise<void> {
  const auth = await requireAuth(request)
  
  const load = await prisma.loadRequest.findUnique({
    where: { id: loadId },
    select: { driverId: true, shipperId: true },
  })

  if (!load) {
    throw new AuthorizationError('Load not found')
  }

  // Check if user is admin user (legacy) or admin driver
  if (auth.userType === 'admin') {
    return // Admins can upload to any load
  }

  if (auth.userType === 'driver') {
    // Check if driver has admin privileges
    const driver = await prisma.driver.findUnique({
      where: { id: auth.userId },
    })
    
    if (driver && (driver as any).isAdmin) {
      return // Admin drivers can upload to any load
    }
    
    // Regular drivers can only upload to their assigned loads
    if (load.driverId !== auth.userId) {
      throw new AuthorizationError('Access denied: Driver is not assigned to this load')
    }
    return
  }

  if (auth.userType === 'shipper') {
    if (load.shipperId !== auth.userId) {
      throw new AuthorizationError('Access denied: Shipper does not own this load')
    }
    return
  }

  throw new AuthorizationError('Access denied')
}

