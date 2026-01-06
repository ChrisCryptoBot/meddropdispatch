/**
 * Comprehensive Audit Logging System
 * Logs all system actions for compliance and security
 */

import { prisma } from './prisma'
import { NextRequest } from 'next/server'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'ASSIGN'
  | 'ACCEPT'
  | 'CANCEL'
  | 'COMPLETE'
  | 'LOCK'
  | 'UNLOCK'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGE'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'PERMISSION_CHANGED'
  | 'DATA_EXPORTED'
  | 'DATA_DELETED'
  | 'SETTINGS_CHANGED'
  | 'OTHER'

export type AuditEntityType =
  | 'LOAD_REQUEST'
  | 'DRIVER'
  | 'SHIPPER'
  | 'INVOICE'
  | 'DOCUMENT'
  | 'FACILITY'
  | 'VEHICLE'
  | 'USER'
  | 'CALLBACK_QUEUE'
  | 'PAYOUT'
  | 'NOTIFICATION'
  | 'AUTH'
  | 'SETTINGS'
  | 'OTHER'

export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export interface AuditLogData {
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string
  userId?: string
  userType?: 'DRIVER' | 'SHIPPER' | 'ADMIN' | 'SYSTEM'
  userEmail?: string
  ipAddress?: string
  userAgent?: string
  changes?: Record<string, { from: any; to: any }>
  metadata?: Record<string, any>
  severity?: AuditSeverity
  success?: boolean
  errorMessage?: string
}

/**
 * Mask sensitive data in objects to prevent PII leaks in logs
 */
export function maskSensitiveData(data: any): any {
  if (!data) return data

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item))
  }

  if (typeof data === 'object') {
    const masked: any = { ...data }
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'ssn', 'socialSecurity',
      'creditCard', 'cc', 'routing', 'accountNumber', 'cvv', 'cvc',
      'dob', 'birthDate', 'driverLicense', 'licenseNumber'
    ]

    for (const key of Object.keys(masked)) {
      // Partial match for sensitive keys (case insensitive)
      const lowerKey = key.toLowerCase()
      if (sensitiveKeys.some(s => lowerKey.includes(s))) {
        masked[key] = '[REDACTED]'
      } else if (typeof masked[key] === 'object') {
        masked[key] = maskSensitiveData(masked[key])
      }
    }
    return masked
  }

  return data
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.userId,
        userType: data.userType,
        userEmail: data.userEmail,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        changes: data.changes ? JSON.stringify(maskSensitiveData(data.changes)) : null,
        metadata: data.metadata ? JSON.stringify(maskSensitiveData(data.metadata)) : null,
        severity: data.severity || 'INFO',
        success: data.success !== false,
        errorMessage: data.errorMessage,
      },
    })
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    // But log the error so we know if audit logging is failing
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Extract user info from request for audit logging
 */
export function extractUserInfoFromRequest(req: NextRequest): {
  ipAddress?: string
  userAgent?: string
} {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    req.ip ||
    undefined

  const userAgent = req.headers.get('user-agent') || undefined

  return { ipAddress, userAgent }
}

/**
 * Log a user action (with automatic user info extraction)
 */
export async function logUserAction(
  action: AuditAction,
  entityType: AuditEntityType,
  options: {
    entityId?: string
    userId?: string
    userType?: 'DRIVER' | 'SHIPPER' | 'ADMIN'
    userEmail?: string
    req?: NextRequest
    changes?: Record<string, { from: any; to: any }>
    metadata?: Record<string, any>
    severity?: AuditSeverity
    success?: boolean
    errorMessage?: string
  }
): Promise<void> {
  const { req, ...rest } = options
  const requestInfo = req ? extractUserInfoFromRequest(req) : {}

  await createAuditLog({
    action,
    entityType,
    ...rest,
    ...requestInfo,
  })
}

/**
 * Log a system action (no user context)
 */
export async function logSystemAction(
  action: AuditAction,
  entityType: AuditEntityType,
  options: {
    entityId?: string
    metadata?: Record<string, any>
    severity?: AuditSeverity
    success?: boolean
    errorMessage?: string
  }
): Promise<void> {
  await createAuditLog({
    action,
    entityType,
    userType: 'SYSTEM',
    ...options,
  })
}

/**
 * Helper to create change log from before/after objects
 */
export function createChangeLog(
  before: Record<string, any>,
  after: Record<string, any>,
  fieldsToTrack?: string[]
): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {}

  const fields = fieldsToTrack || Object.keys(after)

  for (const field of fields) {
    const beforeValue = before[field]
    const afterValue = after[field]

    // Only log if value actually changed
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changes[field] = {
        from: beforeValue,
        to: afterValue,
      }
    }
  }

  return changes
}

