// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  // Filter out health checks and other noise
  beforeSend(event, hint) {
    // Don't send events in development unless explicitly testing
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
      return null
    }
    
    // Filter out known non-critical errors
    if (event.exception) {
      const error = hint.originalException
      if (error instanceof Error) {
        // Filter out expected validation errors
        if (error.message.includes('ValidationError') ||
            error.message.includes('NotFoundError') ||
            error.message.includes('rate limit')) {
          // Still log but with lower severity
          event.level = 'warning'
        }
      }
    }
    
    return event
  },
})

