import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-session'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/check
 * Check current authentication status
 * Used by client components to verify auth
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    
    if (!session) {
      return NextResponse.json({ authenticated: false })
    }

    // Verify user still exists and get full user data
    let userData = null
    
    if (session.userType === 'driver') {
      const driver = await prisma.driver.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          vehicleType: true,
          vehiclePlate: true,
          isAdmin: true,
        },
      })
      if (driver) {
        userData = { ...driver, userType: 'driver' }
      }
    } else if (session.userType === 'shipper') {
      const shipper = await prisma.shipper.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          phone: true,
          clientType: true,
        },
      })
      if (shipper) {
        userData = { ...shipper, userType: 'shipper' }
      }
    } else if (session.userType === 'admin') {
      const admin = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      })
      if (admin) {
        userData = { ...admin, userType: 'admin' }
      }
    }

    if (!userData) {
      // User was deleted, clear session
      const response = NextResponse.json({ authenticated: false })
      response.cookies.delete('auth_session')
      return response
    }

    return NextResponse.json({
      authenticated: true,
      user: userData,
    })
  } catch (error) {
    console.error('Error checking auth:', error)
    return NextResponse.json(
      { authenticated: false, error: 'Failed to check authentication' },
      { status: 500 }
    )
  }
}

