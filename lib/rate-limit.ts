// Rate Limiting
// Prevents API abuse and ensures fair resource usage

import { NextRequest } from 'next/server'
import { RateLimitError } from './errors'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string // Custom error message
}

// In-memory store (for production, use Redis or similar)
const requestStore = new Map<string, { count: number; resetTime: number }>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of requestStore.entries()) {
    if (value.resetTime < now) {
      requestStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

// Default rate limit configurations
export const RATE_LIMITS = {
  // Auth routes - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },
  // General API routes
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Too many requests. Please slow down.',
  },
  // Webhook routes - more lenient
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: 'Webhook rate limit exceeded.',
  },
  // File upload routes - stricter
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
    message: 'Too many file uploads. Please wait before uploading again.',
  },
} as const

/**
 * Get client identifier from request
 */
function getClientId(request: NextRequest): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  // Include user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Create a hash-like identifier
  return `${ip}-${userAgent.slice(0, 50)}`
}

/**
 * Check if request is within rate limit
 */
function checkRateLimit(
  clientId: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = `${clientId}-${config.windowMs}`

  const record = requestStore.get(key)

  if (!record || record.resetTime < now) {
    // Create new record
    const resetTime = now + config.windowMs
    requestStore.set(key, { count: 1, resetTime })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    }
  }

  // Increment count
  record.count++

  if (record.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Rate limit middleware
 */
export function rateLimit(
  config: RateLimitConfig = RATE_LIMITS.api
): (request: NextRequest) => void | RateLimitError {
  return (request: NextRequest) => {
    const clientId = getClientId(request)
    const result = checkRateLimit(clientId, config)

    if (!result.allowed) {
      throw new RateLimitError(
        config.message || `Rate limit exceeded. Try again after ${new Date(result.resetTime).toISOString()}`
      )
    }

    // Add rate limit headers to response (will be added by middleware)
    return undefined
  }
}

/**
 * Get rate limit headers
 */
export function getRateLimitHeaders(
  request: NextRequest,
  config: RateLimitConfig = RATE_LIMITS.api
): Record<string, string> {
  const clientId = getClientId(request)
  const result = checkRateLimit(clientId, config)

  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  }
}

/**
 * Rate limit decorator for API routes
 */
export function withRateLimit(
  config: RateLimitConfig = RATE_LIMITS.api
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (request: NextRequest, ...args: any[]) {
      const limitCheck = rateLimit(config)(request)
      if (limitCheck instanceof RateLimitError) {
        throw limitCheck
      }

      const response = await originalMethod.apply(this, [request, ...args])

      // Add rate limit headers
      const headers = getRateLimitHeaders(request, config)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return response
    }

    return descriptor
  }
}

