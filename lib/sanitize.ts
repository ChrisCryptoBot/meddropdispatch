// Input Sanitization Utilities
// Prevents XSS attacks and ensures data integrity

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [],
  })
}

/**
 * Sanitize text input (removes HTML and trims)
 */
export function sanitizeText(input: string): string {
  if (!input) return ''
  return sanitizeHtml(input).trim()
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return ''
  // Remove any HTML and trim, then validate format
  const cleaned = sanitizeText(email).toLowerCase()
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(cleaned)) {
    throw new Error('Invalid email format')
  }
  return cleaned
}

/**
 * Sanitize phone number (keep only digits, +, -, spaces, parentheses)
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return ''
  // Remove all characters except digits, +, -, spaces, parentheses
  return phone.replace(/[^\d+\-() ]/g, '').trim()
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  if (!url) return ''
  try {
    const cleaned = sanitizeText(url)
    // Validate URL format
    new URL(cleaned)
    return cleaned
  } catch {
    throw new Error('Invalid URL format')
  }
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeText(sanitized[key]) as any
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeObject(sanitized[key]) as any
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) => 
        typeof item === 'string' ? sanitizeText(item) : 
        typeof item === 'object' ? sanitizeObject(item) : 
        item
      ) as any
    }
  }
  
  return sanitized
}

/**
 * Sanitize SQL injection patterns (defense in depth - Prisma handles this, but extra safety)
 */
export function sanitizeSqlInput(input: string): string {
  if (!input) return ''
  // Remove SQL injection patterns
  return input
    .replace(/['";\\]/g, '') // Remove quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .replace(/\*\//g, '')
}

