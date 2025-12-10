import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'

/**
 * POST /api/auth/shipper/login
 * Authenticate a shipper with email and password
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find shipper by email
    const shipper = await prisma.shipper.findUnique({
      where: { email }
    })

    if (!shipper) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if shipper has a password set
    if (!shipper.passwordHash) {
      return NextResponse.json(
        { error: 'Account not set up for login. Please contact support.' },
        { status: 401 }
      )
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, shipper.passwordHash)

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Return shipper data (excluding password hash)
    const { passwordHash, ...shipperData } = shipper

    return NextResponse.json({
      success: true,
      shipper: shipperData
    })

  } catch (error) {
    console.error('Error during shipper login:', error)
    return NextResponse.json(
      { error: 'Login failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
