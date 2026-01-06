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
  let shipperCode = shipper.shipperCode
  if (!shipperCode || shipperCode.trim() === '' || shipperCode === null) {
    // Auto-generate from company name (first 3-4 uppercase letters, alphanumeric only)
    const cleanName = (shipper.companyName || 'SHIPPER').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    let baseCode = cleanName.substring(0, 4)
    if (baseCode.length < 3) {
      baseCode = baseCode.padEnd(3, 'X')
    }
    
    // Ensure uniqueness
    shipperCode = baseCode
    let attempts = 0
    const maxAttempts = 100
    
    while (attempts < maxAttempts) {
      try {
        const existing = await prisma.shipper.findUnique({
          where: { shipperCode },
          select: { id: true }
        })
        
        if (!existing || existing.id === shipperId) {
          break
        }
      } catch (findError) {
        // If findUnique fails (e.g., null shipperCode), just use the generated one
        console.error('Error checking shipper code uniqueness:', findError)
        break
      }
      
      attempts++
      if (attempts < 10) {
        shipperCode = `${baseCode.substring(0, Math.max(2, baseCode.length - 1))}${attempts}`
      } else {
        // Use timestamp as fallback
        const timestamp = Date.now().toString().slice(-4)
        shipperCode = `${baseCode.substring(0, 2)}${timestamp}`.substring(0, 4)
        break
      }
    }
    
    // Final fallback if all attempts failed
    if (!shipperCode || shipperCode.trim() === '') {
      const timestamp = Date.now().toString().slice(-6)
      shipperCode = `SH${timestamp}`.substring(0, 4)
    }
    
    // Update shipper with generated code (handle errors gracefully)
    try {
      await prisma.shipper.update({
        where: { id: shipperId },
        data: { shipperCode }
      })
    } catch (updateError: any) {
      console.error('Error updating shipper code in tracking generation:', updateError)
      // If update fails due to unique constraint, try one more time with timestamp
      if (updateError?.code === 'P2002') {
        const timestamp = Date.now().toString().slice(-6)
        shipperCode = `SH${timestamp}`.substring(0, 4)
        try {
          await prisma.shipper.update({
            where: { id: shipperId },
            data: { shipperCode }
          })
        } catch (retryError) {
          console.error('Error updating shipper code on retry:', retryError)
          // Continue with generated code even if update fails
        }
      }
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
