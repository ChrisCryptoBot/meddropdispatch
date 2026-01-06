/**
 * Startup Checks
 * Critical system validations that run at application startup
 * These checks ensure the application fails fast if critical dependencies are missing
 */

import { checkAuditLogHealth } from './audit-log-health-check'

/**
 * Run all startup checks
 * Should be called when the application starts (e.g., in middleware or API route initialization)
 * In production, these checks will throw errors if critical systems are not configured
 */
export async function runStartupChecks(): Promise<void> {
  const errors: string[] = []

  // Check 1: Audit Logging
  try {
    await checkAuditLogHealth()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (process.env.NODE_ENV === 'production') {
      errors.push(`CRITICAL: ${message}`)
    } else {
      console.warn(`⚠️  Audit log check failed (non-blocking in dev): ${message}`)
    }
  }

  // Check 2: Encryption Key
  const encryptionKey = process.env.ENCRYPTION_KEY
  if (!encryptionKey) {
    const message = 'ENCRYPTION_KEY environment variable is not set'
    if (process.env.NODE_ENV === 'production') {
      errors.push(`CRITICAL: ${message}. Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
    } else {
      console.warn(`⚠️  ${message} - Using default dev key (NOT SECURE FOR PRODUCTION)`)
    }
  } else if (encryptionKey.length !== 64) {
    const message = `ENCRYPTION_KEY must be 64 hex characters (currently ${encryptionKey.length} characters)`
    if (process.env.NODE_ENV === 'production') {
      errors.push(`CRITICAL: ${message}`)
    } else {
      console.warn(`⚠️  ${message}`)
    }
  } else {
    console.log('✅ Encryption key configured')
  }

  // Check 3: Database URL
  if (!process.env.DATABASE_URL) {
    const message = 'DATABASE_URL environment variable is not set'
    if (process.env.NODE_ENV === 'production') {
      errors.push(`CRITICAL: ${message}`)
    } else {
      console.warn(`⚠️  ${message}`)
    }
  } else {
    console.log('✅ Database URL configured')
  }

  // If any critical errors in production, throw
  if (errors.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      `🚨 CRITICAL STARTUP CHECKS FAILED:\n${errors.join('\n')}\n\n` +
      `The application cannot start in production with these issues. Please fix them and restart.`
    )
  }

  // Log summary
  if (errors.length === 0) {
    console.log('✅ All startup checks passed')
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn(`⚠️  ${errors.length} startup check warning(s) (non-blocking in development)`)
  }
}

/**
 * Initialize startup checks (call this once at app startup)
 * In Next.js, this can be called from middleware or a server component
 */
let startupChecksRun = false

export async function initializeStartupChecks(): Promise<void> {
  if (startupChecksRun) {
    return
  }
  
  // Run checks asynchronously to not block startup
  // But log errors immediately
  runStartupChecks().catch((error) => {
    console.error('Startup checks failed:', error)
    if (process.env.NODE_ENV === 'production') {
      // In production, we want to fail fast
      throw error
    }
  })
  
  startupChecksRun = true
}










