// Tracking Code Generation Utilities

import { prisma } from './prisma'

/**
 * Generate a unique public tracking code
 * Format: [SHIPPER]-[YYMMDD]-[###]
 * - SHIPPER: 3-4 letter shipper code (e.g., "AMZ", "BAY", "JSM")
 * - YYMMDD: Date created (e.g., "241210" for Dec 10, 2024)
 * - ###: Sequential number per shipper per day (resets daily)
 * 
 * Example: AMZ-241210-003 (Amazon's 3rd load on Dec 10, 2024)
 */
export async function generateTrackingCode(shipperId: string): Promise<string> {
  // Get shipper to retrieve shipperCode
  const shipper = await prisma.shipper.findUnique({
    where: { id: shipperId },
    select: { shipperCode: true, companyName: true }
  })

  if (!shipper) {
    throw new Error('Shipper not found')
  }

  // Generate shipper code if missing (fallback to first 3-4 letters of company name)
  // EDGE CASE: Ensure shipper has a shipperCode using utility function (handles all edge cases)
  let shipperCode = shipper.shipperCode
  if (!shipperCode || shipperCode.trim() === '' || shipperCode === null) {
    try {
      const { ensureShipperCode } = await import('./shipper-code')
      shipperCode = await ensureShipperCode(shipperId)
    } catch (codeError) {
      console.error('Error ensuring shipper code in tracking generation:', codeError)
      // Final fallback - this should never happen, but ensures we always have a code
      const timestamp = Date.now().toString().slice(-6)
      shipperCode = `SH${timestamp}`.substring(0, 4)
    }
  }
  
  // Final safety check - ensure we always have a shipperCode
  if (!shipperCode || shipperCode.trim() === '' || shipperCode === null) {
    const timestamp = Date.now().toString().slice(-6)
    shipperCode = `SH${timestamp}`.substring(0, 4)
  }

  // Get today's date in YYMMDD format
  const today = new Date()
  const year = today.getFullYear().toString().slice(-2)
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const day = today.getDate().toString().padStart(2, '0')
  const dateStr = `${year}${month}${day}` // e.g., "241210"

  // Count loads for this shipper created today
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)
  
  const countToday = await prisma.loadRequest.count({
    where: {
      shipperId: shipperId,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  })

  // Generate sequence number (1-indexed, padded to 3 digits)
  const sequence = (countToday + 1).toString().padStart(3, '0')

  // Build tracking code: SHIPPER-YYMMDD-###
  const trackingCode = `${shipperCode}-${dateStr}-${sequence}`

  // Verify uniqueness (should be unique, but double-check)
  const existing = await prisma.loadRequest.findUnique({
    where: { publicTrackingCode: trackingCode }
  })

  if (existing) {
    // Collision detected - increment sequence and try again
    const newSequence = (countToday + 2).toString().padStart(3, '0')
    return `${shipperCode}-${dateStr}-${newSequence}`
  }

  return trackingCode
}

/**
 * Validate tracking code format
 * Format: [SHIPPER]-[YYMMDD]-[###]
 * Example: AMZ-241210-003
 */
export function isValidTrackingCode(code: string): boolean {
  // Format: 3-4 uppercase letters, date (YYMMDD), 3-digit sequence
  const regex = /^[A-Z]{3,4}-\d{6}-\d{3}$/
  return regex.test(code)
}

/**
 * Format tracking code for display (ensure uppercase, proper format)
 */
export function formatTrackingCode(code: string): string {
  return code.toUpperCase().trim()
}
