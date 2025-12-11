// Structured Logging System
// Replaces console.log with proper logging levels and structured data

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: Error): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    const errorStr = error ? ` Error: ${error.message}${error.stack ? `\n${error.stack}` : ''}` : ''
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}${errorStr}`
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) return true // Log everything in development
    
    // In production, only log warn and error
    return level === 'warn' || level === 'error'
  }

  debug(message: string, context?: LogContext) {
    if (!this.shouldLog('debug')) return
    console.debug(this.formatMessage('debug', message, context))
  }

  info(message: string, context?: LogContext) {
    if (!this.shouldLog('info')) return
    console.info(this.formatMessage('info', message, context))
  }

  warn(message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog('warn')) return
    console.warn(this.formatMessage('warn', message, context, error))
    
    // In production, send warnings to error tracking service
    if (this.isProduction && error) {
      // TODO: Integrate with Sentry or similar
      // Sentry.captureException(error, { level: 'warning', contexts: context })
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (!this.shouldLog('error')) return
    console.error(this.formatMessage('error', message, context, error))
    
    // In production, send errors to error tracking service
    if (this.isProduction) {
      // TODO: Integrate with Sentry or similar
      // Sentry.captureException(error || new Error(message), { level: 'error', contexts: context })
    }
  }

  // Request logging helper
  logRequest(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    this[level](`${method} ${path} ${statusCode} ${duration}ms`, {
      method,
      path,
      statusCode,
      duration,
      ...context,
    })
  }

  // API error logging helper
  logApiError(endpoint: string, error: Error, context?: LogContext) {
    this.error(`API Error: ${endpoint}`, error, {
      endpoint,
      ...context,
    })
  }

  // Database query logging helper
  logQuery(query: string, duration: number, context?: LogContext) {
    if (duration > 1000) {
      this.warn(`Slow query detected: ${duration}ms`, { query, duration, ...context })
    } else if (this.isDevelopment) {
      this.debug(`Query executed: ${duration}ms`, { query, duration, ...context })
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for use in other files
export type { LogLevel, LogContext }

