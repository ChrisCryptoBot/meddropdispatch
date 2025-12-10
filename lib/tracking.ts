// Tracking Code Generation Utilities

import { prisma } from './prisma'

/**
 * Generate a unique public tracking code
 * Format: MED-XXXX-YY
 * - MED: Company prefix
 * - XXXX: Sequential 4-digit number
 * - YY: Random 2-letter suffix for uniqueness
 */
export async function generateTrackingCode(): Promise<string> {
  const maxAttempts = 10

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Get the count of existing load requests to generate sequential number
    const count = await prisma.loadRequest.count()
    const sequential = (count + 1).toString().padStart(4, '0')

    // Generate random 2-letter suffix
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const suffix = Array.from({ length: 2 }, () =>
      letters[Math.floor(Math.random() * letters.length)]
    ).join('')

    const trackingCode = `MED-${sequential}-${suffix}`

    // Check if this code already exists
    const existing = await prisma.loadRequest.findUnique({
      where: { publicTrackingCode: trackingCode }
    })

    if (!existing) {
      return trackingCode
    }
  }

  // Fallback: use timestamp-based code if we somehow get collisions
  const timestamp = Date.now().toString().slice(-6)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const suffix = Array.from({ length: 2 }, () =>
    letters[Math.floor(Math.random() * letters.length)]
  ).join('')

  return `MED-${timestamp}-${suffix}`
}

/**
 * Validate tracking code format
 */
export function isValidTrackingCode(code: string): boolean {
  // Format: MED-XXXX-YY (flexible on the middle part length)
  const regex = /^MED-\d{4,}-[A-Z]{2}$/
  return regex.test(code)
}

/**
 * Format tracking code for display (ensure uppercase, proper format)
 */
export function formatTrackingCode(code: string): string {
  return code.toUpperCase().trim()
}
