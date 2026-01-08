/**
 * Shipper Code Generation and Management Utilities
 * 
 * Ensures all shippers have a unique client ID (shipperCode)
 */

import { prisma } from './prisma'

/**
 * Generate a unique shipperCode from a company name
 * Format: 3-4 uppercase alphanumeric characters
 * 
 * @param companyName - The company name to generate code from
 * @param excludeShipperId - Optional shipper ID to exclude from uniqueness check (for updates)
 * @returns A unique shipperCode
 */
export async function generateShipperCode(
  companyName: string,
  excludeShipperId?: string
): Promise<string> {
  // Edge case: Empty or null company name
  if (!companyName || companyName.trim() === '') {
    const timestamp = Date.now().toString().slice(-6)
    return `SH${timestamp}`.substring(0, 4)
  }

  // Clean company name: remove special characters, convert to uppercase
  const cleanName = companyName.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  
  // Edge case: Company name has no alphanumeric characters
  if (cleanName.length === 0) {
    const timestamp = Date.now().toString().slice(-6)
    return `SH${timestamp}`.substring(0, 4)
  }

  // Generate base code (first 4 characters, or pad if shorter)
  let baseCode = cleanName.substring(0, 4)
  if (baseCode.length < 3) {
    baseCode = baseCode.padEnd(3, 'X')
  }

  // Try base code first
  let shipperCode = baseCode
  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    try {
      const existing = await prisma.shipper.findUnique({
        where: { shipperCode },
        select: { id: true }
      })

      // If no existing shipper with this code, or it's the same shipper (for updates), use it
      if (!existing || (excludeShipperId && existing.id === excludeShipperId)) {
        break
      }

      // Code exists, try variations
      attempts++
      
      if (attempts < 10) {
        // Try adding a number (1-9)
        shipperCode = `${baseCode.substring(0, Math.max(2, baseCode.length - 1))}${attempts}`
      } else if (attempts < 50) {
        // Try using last 2 chars of base + attempt number (padded to 2 digits)
        const attemptStr = attempts.toString().padStart(2, '0')
        shipperCode = `${baseCode.substring(0, 2)}${attemptStr}`.substring(0, 4)
      } else {
        // Fallback: Use timestamp
        const timestamp = Date.now().toString().slice(-4)
        shipperCode = `${baseCode.substring(0, 2)}${timestamp}`.substring(0, 4)
        break
      }
    } catch (findError: any) {
      // If findUnique fails (e.g., null shipperCode), use the generated one
      console.error('Error checking shipper code uniqueness:', findError)
      break
    }
  }

  // Final fallback if all attempts failed or code is still empty
  if (!shipperCode || shipperCode.trim() === '' || shipperCode.length < 3) {
    const timestamp = Date.now().toString().slice(-6)
    shipperCode = `SH${timestamp}`.substring(0, 4)
  }

  return shipperCode
}

/**
 * Ensure a shipper has a shipperCode, generating one if missing
 * This function will update the shipper in the database if a code was generated
 * 
 * @param shipperId - The shipper ID to ensure has a code
 * @returns The shipperCode (existing or newly generated)
 */
export async function ensureShipperCode(shipperId: string): Promise<string> {
  const shipper = await prisma.shipper.findUnique({
    where: { id: shipperId },
    select: { id: true, shipperCode: true, companyName: true }
  })

  if (!shipper) {
    throw new Error('Shipper not found')
  }

  // If shipper already has a code, return it
  if (shipper.shipperCode && shipper.shipperCode.trim() !== '') {
    return shipper.shipperCode
  }

  // Generate a new code
  const shipperCode = await generateShipperCode(shipper.companyName, shipperId)

  // Update shipper with generated code
  try {
    await prisma.shipper.update({
      where: { id: shipperId },
      data: { shipperCode }
    })
  } catch (updateError: any) {
    console.error('Error updating shipper code:', updateError)
    
    // If update fails due to unique constraint, generate a new code with timestamp
    if (updateError?.code === 'P2002') {
      const timestamp = Date.now().toString().slice(-6)
      const fallbackCode = `SH${timestamp}`.substring(0, 4)
      
      try {
        await prisma.shipper.update({
          where: { id: shipperId },
          data: { shipperCode: fallbackCode }
        })
        return fallbackCode
      } catch (retryError) {
        console.error('Error updating shipper code on retry:', retryError)
        // Return the generated code even if update fails (it will be retried next time)
        return shipperCode
      }
    }
    
    // Return the generated code even if update fails (it will be retried next time)
    return shipperCode
  }

  return shipperCode
}

/**
 * Get or generate shipperCode for a shipper (doesn't update database)
 * Useful for read-only operations where you just need the code value
 * 
 * @param shipper - Shipper object with id, shipperCode, and companyName
 * @returns The shipperCode (existing or generated, but not saved)
 */
export async function getOrGenerateShipperCode(shipper: {
  id: string
  shipperCode: string | null
  companyName: string
}): Promise<string> {
  // If shipper already has a code, return it
  if (shipper.shipperCode && shipper.shipperCode.trim() !== '') {
    return shipper.shipperCode
  }

  // Generate a code (but don't save it - caller can decide whether to save)
  return await generateShipperCode(shipper.companyName, shipper.id)
}
