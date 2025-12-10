import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword } from '@/lib/auth'

/**
 * PATCH /api/shippers/[id]/password
 * Update shipper password
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Get shipper with password hash
    const shipper = await prisma.shipper.findUnique({
      where: { id },
      select: { passwordHash: true },
    })

    if (!shipper || !shipper.passwordHash) {
      return NextResponse.json(
        { error: 'Shipper not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, shipper.passwordHash)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password
    await prisma.shipper.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating password:', error)
    return NextResponse.json(
      { error: 'Failed to update password', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

