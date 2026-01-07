/**
 * Performance optimization utilities
 */

// Request deduplication cache
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>()
const CACHE_TTL = 5000 // 5 seconds

/**
 * Deduplicates concurrent requests with the same key
 * Prevents multiple identical API calls from running simultaneously
 */
export function dedupeRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const cached = requestCache.get(key)
  const now = Date.now()

  // Return cached promise if it's still valid
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.promise
  }

  // Create new request
  const promise = requestFn().finally(() => {
    // Clean up after request completes
    setTimeout(() => {
      requestCache.delete(key)
    }, CACHE_TTL)
  })

  requestCache.set(key, { promise, timestamp: now })
  return promise
}

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function to limit function execution rate
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

