/**
 * Sentry Error Tracking Integration
 * Provides error tracking and monitoring for production
 * 
 * NOTE: Sentry is optional. If @sentry/nextjs is not installed,
 * all functions will gracefully degrade to console logging.
 */

// Only initialize Sentry in production or if SENTRY_DSN is set
const shouldInitializeSentry = 
  process.env.NODE_ENV === 'production' || 
  process.env.SENTRY_DSN !== undefined

let Sentry: any = null

// Lazy load Sentry only when needed (prevents build-time errors)
function getSentry() {
  if (Sentry !== null) return Sentry // Already checked
  
  if (!shouldInitializeSentry || typeof window !== 'undefined') {
    Sentry = false // Mark as checked, not available
    return null
  }
  
  try {
    // Dynamic require - only executed at runtime
    // This prevents webpack from trying to bundle @sentry/nextjs
    const SentryModule = eval('require')('@sentry/nextjs')
    Sentry = SentryModule
    return SentryModule
  } catch (error) {
    // Sentry is optional - mark as checked and unavailable
    Sentry = false
    return null
  }
}

/**
 * Initialize Sentry (call this in your app initialization)
 */
export function initSentry() {
  const SentryModule = getSentry()
  if (!SentryModule) return

  try {
    SentryModule.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV === 'development',
      beforeSend(event: any, hint: any) {
        // Filter out sensitive data
        if (event.request) {
          // Remove sensitive fields from request data
          const sensitiveFields = ['password', 'passwordHash', 'accountNumber', 'routingNumber', 'taxId', 'ssn']
          if (event.request.data) {
            sensitiveFields.forEach(field => {
              if (event.request.data[field]) {
                event.request.data[field] = '[REDACTED]'
              }
            })
          }
        }
        return event
      },
    })
  } catch (error) {
    console.error('Failed to initialize Sentry:', error)
  }
}

/**
 * Capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  const SentryModule = getSentry()
  if (!SentryModule) {
    console.error('Error (Sentry not initialized):', error, context)
    return
  }

  try {
    SentryModule.captureException(error, {
      contexts: {
        custom: context || {},
      },
    })
  } catch (err) {
    console.error('Failed to capture exception in Sentry:', err)
  }
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  const SentryModule = getSentry()
  if (!SentryModule) {
    console.log(`[${level.toUpperCase()}] ${message}`, context)
    return
  }

  try {
    SentryModule.captureMessage(message, {
      level: level as any,
      contexts: {
        custom: context || {},
      },
    })
  } catch (err) {
    console.error('Failed to capture message in Sentry:', err)
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, any>) {
  const SentryModule = getSentry()
  if (!SentryModule) return

  try {
    SentryModule.addBreadcrumb({
      message,
      category,
      level: level as any,
      data,
    })
  } catch (err) {
    // Silently fail - breadcrumbs are not critical
  }
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; type?: string }) {
  const SentryModule = getSentry()
  if (!SentryModule) return

  try {
    SentryModule.setUser({
      id: user.id,
      email: user.email,
      username: user.type,
    })
  } catch (err) {
    // Silently fail
  }
}

export default {
  initSentry,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
}

