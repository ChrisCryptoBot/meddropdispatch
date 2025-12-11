// Email Parser Utility
// Parses incoming emails and extracts relevant information for quote requests

import { ParsedEmailData } from './types'
import { parseAddresses } from './address-parser'

/**
 * Parse email content and extract shipper info, addresses, and description
 */
export function parseEmailContent(emailData: {
  from: string
  subject: string
  body: string
}): ParsedEmailData {
  const { from, subject, body } = emailData

  // Extract shipper information from email
  const shipperInfo = extractShipperInfo(from, body)

  // Parse addresses from email body
  const addresses = parseAddresses(body)

  // Extract description (commodity info if mentioned)
  const description = extractDescription(body, subject)

  return {
    from,
    subject,
    body,
    pickupAddress: addresses.pickupAddress,
    dropoffAddress: addresses.dropoffAddress,
    description,
    shipperName: shipperInfo.name,
    shipperCompany: shipperInfo.company,
    shipperPhone: shipperInfo.phone,
  }
}

/**
 * Extract shipper information from email sender and body
 */
function extractShipperInfo(from: string, body: string): {
  name?: string
  company?: string
  phone?: string
} {
  const info: { name?: string; company?: string; phone?: string } = {}

  // Extract email address and name from "From" field
  // Format: "John Doe <john@example.com>" or "john@example.com"
  const emailMatch = from.match(/(?:([^<]+)\s*<)?([^>]+@[^>]+)>?/)

  if (emailMatch) {
    if (emailMatch[1]) {
      info.name = emailMatch[1].trim().replace(/^["']|["']$/g, '')
    }

    // Extract company from email domain
    const email = emailMatch[2]
    const domain = email.split('@')[1]
    if (domain) {
      // Convert domain to company name (e.g., "abchealth.com" -> "ABC Health")
      const companyFromDomain = domain
        .split('.')[0]
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())

      info.company = companyFromDomain
    }
  }

  // Look for company name in email body
  const companyPatterns = [
    /(?:company|from|organization|org)\s*[:\-]?\s*([A-Za-z0-9\s&',.-]+?)(?:\n|$)/i,
    /^([A-Z][A-Za-z0-9\s&',.-]{3,30})$/m, // Company name on its own line
  ]

  for (const pattern of companyPatterns) {
    const match = body.match(pattern)
    if (match && match[1]) {
      const potentialCompany = match[1].trim()
      // If longer than current company or current is from domain, use this
      if (
        !info.company ||
        potentialCompany.length > info.company.length ||
        info.company.toLowerCase().includes('gmail') ||
        info.company.toLowerCase().includes('yahoo') ||
        info.company.toLowerCase().includes('outlook')
      ) {
        info.company = potentialCompany
      }
      break
    }
  }

  // Look for phone number in email body
  const phonePatterns = [
    /(?:phone|tel|mobile|cell|contact)\s*[:\-]?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
    /\b(\d{3}[-.\s]\d{3}[-.\s]\d{4})\b/,
    /\b(\(\d{3}\)\s*\d{3}[-.\s]\d{4})\b/,
  ]

  for (const pattern of phonePatterns) {
    const match = body.match(pattern)
    if (match && match[1]) {
      info.phone = normalizePhoneNumber(match[1])
      break
    }
  }

  return info
}

/**
 * Extract description/commodity information from email
 */
function extractDescription(body: string, subject: string): string {
  // Look for description patterns in body
  const descriptionPatterns = [
    /(?:description|details|commodity|item|what)\s*[:\-]?\s*([^\n]+)/i,
    /(?:shipping|transporting|need\s+to\s+transport)\s+([^\n.;]+)/i,
  ]

  for (const pattern of descriptionPatterns) {
    const match = body.match(pattern)
    if (match && match[1]) {
      const desc = match[1].trim()
      if (desc.length > 10 && desc.length < 200) {
        return desc
      }
    }
  }

  // If no description found, use first line of body or subject
  const firstLine = body.split('\n')[0].trim()
  if (firstLine && firstLine.length > 10 && firstLine.length < 100) {
    return firstLine
  }

  // Fallback to subject if it's descriptive
  if (subject && subject.length > 5 && subject.length < 100) {
    return subject
  }

  return 'See email for details'
}

/**
 * Normalize phone number to standard format
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Format as (XXX) XXX-XXXX if 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // Format as +X (XXX) XXX-XXXX if 11 digits
  if (digits.length === 11) {
    return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  // Return as-is if doesn't match expected lengths
  return phone
}

/**
 * Detect service type from email content
 */
export function detectServiceType(body: string, subject: string): string {
  const text = `${subject} ${body}`.toLowerCase()

  if (text.includes('stat') || text.includes('urgent') || text.includes('asap')) {
    return 'STAT'
  }

  if (text.includes('same day') || text.includes('today')) {
    return 'SAME_DAY'
  }

  if (text.includes('scheduled') || text.includes('route')) {
    return 'SCHEDULED_ROUTE'
  }

  if (text.includes('government') || text.includes('gov')) {
    return 'GOVERNMENT'
  }

  // Default to SAME_DAY
  return 'SAME_DAY'
}

/**
 * Validate parsed email data
 * Returns true if minimum required information is present
 */
export function validateParsedEmail(data: ParsedEmailData): {
  valid: boolean
  missing: string[]
} {
  const missing: string[] = []

  if (!data.from) missing.push('sender email')
  if (!data.pickupAddress) missing.push('pickup address')
  if (!data.dropoffAddress) missing.push('dropoff address')

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Sanitize email content to prevent XSS and other security issues
 */
export function sanitizeEmailContent(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

