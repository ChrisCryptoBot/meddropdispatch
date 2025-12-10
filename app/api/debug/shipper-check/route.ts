import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'

/**
 * Debug endpoint to check shipper account status
 * DELETE THIS IN PRODUCTION
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const shipper = await prisma.shipper.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!shipper) {
      return NextResponse.json({
        found: false,
        message: 'Shipper not found'
      })
    }

    const result: any = {
      found: true,
      email: shipper.email,
      companyName: shipper.companyName,
      hasPasswordHash: !!shipper.passwordHash,
      passwordHashLength: shipper.passwordHash?.length || 0,
      isActive: shipper.isActive,
    }

    if (password && shipper.passwordHash) {
      try {
        const isValid = await verifyPassword(password, shipper.passwordHash)
        result.passwordMatch = isValid
        result.passwordTest = isValid ? 'PASS' : 'FAIL'
      } catch (error) {
        result.passwordTest = 'ERROR'
        result.passwordError = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({
      error: 'Debug check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

