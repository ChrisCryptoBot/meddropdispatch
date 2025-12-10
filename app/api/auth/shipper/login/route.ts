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

    // Find shipper by email (case-insensitive)
    const shipper = await prisma.shipper.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!shipper) {
      console.error('Shipper not found for email:', email.toLowerCase())
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if shipper has a password set
    if (!shipper.passwordHash) {
      console.error('Shipper found but no password hash set for email:', email.toLowerCase())
      return NextResponse.json(
        { error: 'Account not set up for login. Please contact support.' },
        { status: 401 }
      )
    }

    // Verify password
    const passwordValid = await verifyPassword(password, shipper.passwordHash)

    if (!passwordValid) {
      console.error('Password verification failed for email:', email.toLowerCase())
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('Shipper login successful for email:', email.toLowerCase())

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
