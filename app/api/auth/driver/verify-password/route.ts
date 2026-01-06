import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'

/**
 * POST /api/auth/driver/verify-password
 * Verify driver's current password
 */
export async function POST(request: NextRequest) {
  try {
    const { driverId, password } = await request.json()

    if (!driverId || !password) {
      return NextResponse.json(
        { error: 'Driver ID and password are required' },
        { status: 400 }
      )
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { passwordHash: true },
    })

    if (!driver || !driver.passwordHash) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    const isValid = await verifyPassword(password, driver.passwordHash)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Error verifying password:', error)
    return NextResponse.json(
      { error: 'Failed to verify password', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

