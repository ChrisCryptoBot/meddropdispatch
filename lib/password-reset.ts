// Password Reset Utilities
// Handles token generation, validation, and cleanup

import { prisma } from './prisma'
import { randomBytes } from 'crypto'

const TOKEN_EXPIRY_HOURS = 1 // Token expires in 1 hour
const TOKEN_LENGTH = 32 // 32 bytes = 64 hex characters

/**
 * Generate a secure random token for password reset
 */
export function generateResetToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('hex')
}

/**
 * Create a password reset token for a user
 */
export async function createPasswordResetToken(
  userId: string,
  userType: 'driver' | 'shipper' | 'admin'
): Promise<string> {
  // Invalidate any existing unused tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: {
      userId,
      userType,
      used: false,
    },
    data: {
      used: true,
    },
  })

  // Generate new token
  const token = generateResetToken()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS)

  // Create token record
  await prisma.passwordResetToken.create({
    data: {
      userId,
      userType,
      token,
      expiresAt,
    },
  })

  return token
}

/**
 * Validate a password reset token
 */
export async function validateResetToken(
  token: string
): Promise<{ valid: boolean; userId?: string; userType?: 'driver' | 'shipper' | 'admin' }> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  })

  if (!resetToken) {
    return { valid: false }
  }

  // Check if token is used
  if (resetToken.used) {
    return { valid: false }
  }

  // Check if token is expired
  if (resetToken.expiresAt < new Date()) {
    // Mark as used to prevent reuse
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    })
    return { valid: false }
  }

  return {
    valid: true,
    userId: resetToken.userId,
    userType: resetToken.userType as 'driver' | 'shipper' | 'admin',
  }
}

/**
 * Mark a reset token as used
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  await prisma.passwordResetToken.updateMany({
    where: { token },
    data: { used: true },
  })
}

/**
 * Clean up expired tokens (should be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { used: true },
      ],
    },
  })

  return result.count
}

