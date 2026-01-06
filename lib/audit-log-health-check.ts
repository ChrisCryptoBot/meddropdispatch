/**
 * Audit Log Health Check
 * Verifies that the AuditLog table exists and is accessible
 * Call this at application startup to fail fast if audit logging is broken
 */

import { prisma } from './prisma'

let healthCheckPerformed = false
let healthCheckPassed = false

/**
 * Perform health check on audit logging system
 * Should be called at application startup
 * Throws error if audit logging is not available (critical for compliance)
 */
export async function checkAuditLogHealth(): Promise<void> {
  if (healthCheckPerformed) {
    if (!healthCheckPassed) {
      throw new Error(
        'Audit logging health check failed. The AuditLog table may not exist. ' +
        'Run: npx prisma migrate dev --name add_audit_logging'
      )
    }
    return
  }

  try {
    // Try to query the AuditLog table
    // This will fail if the table doesn't exist (migration not run)
    await prisma.$queryRaw`SELECT 1 FROM "AuditLog" LIMIT 1`
    
    healthCheckPassed = true
    healthCheckPerformed = true
    console.log('✅ Audit logging health check passed')
  } catch (error) {
    healthCheckPerformed = true
    healthCheckPassed = false
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // In production, this is a critical failure - fail fast
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `🚨 CRITICAL: Audit logging is not available. This is a compliance requirement. ` +
        `Error: ${errorMessage}. ` +
        `Run migration: npx prisma migrate dev --name add_audit_logging`
      )
    }
    
    // In development, warn but don't crash
    console.error('⚠️  WARNING: Audit logging health check failed:', errorMessage)
    console.error('⚠️  Run migration: npx prisma migrate dev --name add_audit_logging')
  }
}

/**
 * Get health check status (for monitoring endpoints)
 */
export function getAuditLogHealthStatus(): { healthy: boolean; checked: boolean } {
  return {
    healthy: healthCheckPassed,
    checked: healthCheckPerformed,
  }
}











