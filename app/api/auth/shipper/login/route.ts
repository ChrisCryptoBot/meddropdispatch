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
    
    console.log('Login attempt received:', {
      email,
      hasPassword: !!password,
      passwordLength: password?.length || 0
    })

    if (!email || !password) {
      console.error('Missing email or password')
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
    console.log('Attempting password verification...', {
      passwordHashLength: shipper.passwordHash.length,
      passwordHashPrefix: shipper.passwordHash.substring(0, 10)
    })
    
    try {
      const passwordValid = await verifyPassword(password, shipper.passwordHash)
      console.log('Password verification result:', passwordValid)

      if (!passwordValid) {
        console.error('Password verification failed for email:', email.toLowerCase())
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }
    } catch (verifyError) {
      console.error('Password verification threw an error:', verifyError)
      return NextResponse.json(
        { error: 'Login failed', message: verifyError instanceof Error ? verifyError.message : 'Unknown error' },
        { status: 500 }
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
