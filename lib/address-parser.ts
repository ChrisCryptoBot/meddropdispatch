// Address Parser Utility
// Extracts pickup and dropoff addresses from email body text

export interface ParsedAddresses {
  pickupAddress?: string
  dropoffAddress?: string
  success: boolean
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Parse addresses from email body text
 * Looks for common patterns like "Pickup:", "From:", "To:", etc.
 */
export function parseAddresses(emailBody: string): ParsedAddresses {
  const text = emailBody.trim()

  // Try different parsing strategies in order of confidence
  const strategies = [
    parseExplicitLabels,
    parseFromToPattern,
    parseAddressBlocks,
  ]

  for (const strategy of strategies) {
    const result = strategy(text)
    if (result.success) {
      return result
    }
  }

  // If no strategy succeeded, return failure
  return {
    success: false,
    confidence: 'low',
  }
}

/**
 * Strategy 1: Look for explicit labels like "Pickup:", "From:", "Delivery:", "To:"
 */
function parseExplicitLabels(text: string): ParsedAddresses {
  // Pickup patterns
  const pickupPatterns = [
    /(?:pickup|pick\s*up|pick-up|from|origin|pickup\s*(?:at|address|location))\s*[:\-]?\s*([^\n]+(?:\n[^\n:]+)?)/i,
  ]

  // Dropoff patterns
  const dropoffPatterns = [
    /(?:drop\s*off|dropoff|drop-off|delivery|deliver\s*to|to|destination|dropoff\s*(?:at|address|location))\s*[:\-]?\s*([^\n]+(?:\n[^\n:]+)?)/i,
  ]

  let pickupAddress: string | undefined
  let dropoffAddress: string | undefined

  // Try to find pickup address
  for (const pattern of pickupPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      pickupAddress = cleanAddress(match[1])
      break
    }
  }

  // Try to find dropoff address
  for (const pattern of dropoffPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      dropoffAddress = cleanAddress(match[1])
      break
    }
  }

  if (pickupAddress && dropoffAddress) {
    return {
      pickupAddress,
      dropoffAddress,
      success: true,
      confidence: 'high',
    }
  } else if (pickupAddress || dropoffAddress) {
    return {
      pickupAddress,
      dropoffAddress,
      success: true,
      confidence: 'medium',
    }
  }

  return { success: false, confidence: 'low' }
}

/**
 * Strategy 2: Look for "from X to Y" pattern
 */
function parseFromToPattern(text: string): ParsedAddresses {
  const patterns = [
    /from\s+([^to]+?)\s+to\s+([^\n.;]+)/i,
    /pick\s*up\s+(?:at|from)\s+([^,]+(?:,[^,]+){2,}?)\s+(?:and\s+)?deliver\s+(?:to|at)\s+([^.;]+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1] && match[2]) {
      return {
        pickupAddress: cleanAddress(match[1]),
        dropoffAddress: cleanAddress(match[2]),
        success: true,
        confidence: 'high',
      }
    }
  }

  return { success: false, confidence: 'low' }
}

/**
 * Strategy 3: Look for address blocks (line with number, street, city, state, ZIP)
 * This is a fallback strategy with lower confidence
 */
function parseAddressBlocks(text: string): ParsedAddresses {
  // Pattern for US addresses: "123 Main St, City, State ZIP"
  const addressPattern = /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct|Circle|Cir|Place|Pl)[,\s]+[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/gi

  const matches = text.match(addressPattern)

  if (matches && matches.length >= 2) {
    return {
      pickupAddress: cleanAddress(matches[0]),
      dropoffAddress: cleanAddress(matches[1]),
      success: true,
      confidence: 'medium',
    }
  } else if (matches && matches.length === 1) {
    return {
      pickupAddress: cleanAddress(matches[0]),
      success: true,
      confidence: 'low',
    }
  }

  return { success: false, confidence: 'low' }
}

/**
 * Clean and normalize address string
 */
function cleanAddress(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\r\n]+/g, ', ') // Convert newlines to commas
    .replace(/,\s*,/g, ',') // Remove duplicate commas
    .replace(/,\s*$/g, '') // Remove trailing comma
    .replace(/^\s*,\s*/g, '') // Remove leading comma
}

/**
 * Validate that a string looks like a valid address
 * Returns true if it contains at least a street number and name
 */
export function isValidAddress(address: string): boolean {
  if (!address || address.length < 10) {
    return false
  }

  // Should have at least a number and some text
  const hasNumber = /\d+/.test(address)
  const hasStreet = /(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|court|ct)/i.test(
    address
  )
  const hasCity = /[a-z]{3,}/i.test(address)

  return hasNumber && (hasStreet || hasCity)
}

/**
 * Extract city and state from address string
 */
export function extractCityState(address: string): {
  city?: string
  state?: string
} {
  // Pattern: "City, State ZIP" or "City, ST ZIP"
  const pattern = /,\s*([A-Za-z\s]+),\s*([A-Z]{2})\s+\d{5}/

  const match = address.match(pattern)

  if (match) {
    return {
      city: match[1].trim(),
      state: match[2].trim(),
    }
  }

  return {}
}

