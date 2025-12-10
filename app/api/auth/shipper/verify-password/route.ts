import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'

/**
 * POST /api/auth/shipper/verify-password
 * Verify shipper's current password
 */
export async function POST(request: NextRequest) {
  try {
    const { shipperId, password } = await request.json()

    if (!shipperId || !password) {
      return NextResponse.json(
        { error: 'Shipper ID and password are required' },
        { status: 400 }
      )
    }

    const shipper = await prisma.shipper.findUnique({
      where: { id: shipperId },
      select: { passwordHash: true },
    })

    if (!shipper || !shipper.passwordHash) {
      return NextResponse.json(
        { error: 'Shipper not found' },
        { status: 404 }
      )
    }

    const isValid = await verifyPassword(password, shipper.passwordHash)

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

