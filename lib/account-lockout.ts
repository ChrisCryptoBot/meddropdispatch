// Account Lockout Utilities
// Handles tracking failed login attempts and locking accounts

import { prisma } from './prisma'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15
const ATTEMPT_WINDOW_MINUTES = 15

/**
 * Check if an account is locked
 */
export async function checkAccountLockout(
  email: string,
  userType: 'driver' | 'shipper' | 'admin',
  ipAddress?: string
): Promise<{ locked: boolean; lockedUntil?: Date; remainingAttempts?: number }> {
  // Find the most recent login attempt for this email/userType
  const recentAttempt = await prisma.loginAttempt.findFirst({
    where: {
      email: email.toLowerCase(),
      userType,
      createdAt: {
        gte: new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Check if account is currently locked
  if (recentAttempt?.lockedUntil && recentAttempt.lockedUntil > new Date()) {
    return {
      locked: true,
      lockedUntil: recentAttempt.lockedUntil,
    }
  }

  // Count recent failed attempts
  const recentFailures = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      userType,
      success: false,
      createdAt: {
        gte: new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000),
      },
    },
  })

  // Calculate remaining attempts
  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - recentFailures)

  // If max attempts reached, lock the account
  if (recentFailures >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    
    // Create lockout record
    await prisma.loginAttempt.create({
      data: {
        email: email.toLowerCase(),
        userType,
        ipAddress,
        success: false,
        lockedUntil,
        attemptCount: recentFailures + 1,
      },
    })

    return {
      locked: true,
      lockedUntil,
    }
  }

  return {
    locked: false,
    remainingAttempts,
  }
}

/**
 * Record a login attempt
 */
export async function recordLoginAttempt(
  email: string,
  userType: 'driver' | 'shipper' | 'admin',
  success: boolean,
  ipAddress?: string
): Promise<void> {
  // If successful, clear recent failed attempts for this email/userType
  if (success) {
    // Delete recent failed attempts (they're cleared on successful login)
    await prisma.loginAttempt.deleteMany({
      where: {
        email: email.toLowerCase(),
        userType,
        success: false,
        createdAt: {
          gte: new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000),
        },
      },
    })
  }

  // Record the attempt
  await prisma.loginAttempt.create({
    data: {
      email: email.toLowerCase(),
      userType,
      ipAddress,
      success,
      attemptCount: 1,
    },
  })
}

/**
 * Get remaining login attempts before lockout
 */
export async function getRemainingAttempts(
  email: string,
  userType: 'driver' | 'shipper' | 'admin'
): Promise<number> {
  const recentFailures = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      userType,
      success: false,
      createdAt: {
        gte: new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000),
      },
    },
  })

  return Math.max(0, MAX_FAILED_ATTEMPTS - recentFailures)
}

/**
 * Clean up old login attempt records (should be run periodically)
 */
export async function cleanupOldAttempts(): Promise<number> {
  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

  const result = await prisma.loginAttempt.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  })

  return result.count
}

