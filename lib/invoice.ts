// Invoice Generation Utilities

import { prisma } from './prisma'

/**
 * Generate next invoice number in format: INV-YYYY-NNN
 * Where YYYY is the current year and NNN is a sequential number
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`

  // Find the highest invoice number for this year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  })

  let sequence = 1
  if (lastInvoice) {
    // Extract sequence number from last invoice (e.g., "INV-2024-042" -> 42)
    const match = lastInvoice.invoiceNumber.match(/-(\d+)$/)
    if (match) {
      sequence = parseInt(match[1], 10) + 1
    }
  }

  // Format with leading zeros (e.g., 001, 042, 999)
  const sequenceStr = sequence.toString().padStart(3, '0')
  return `${prefix}${sequenceStr}`
}

/**
 * Calculate due date based on payment terms and invoice date
 */
export function calculateDueDate(invoiceDate: Date, paymentTerms: string): Date {
  const dueDate = new Date(invoiceDate)
  
  switch (paymentTerms) {
    case 'NET_7':
      dueDate.setDate(dueDate.getDate() + 7)
      break
    case 'NET_14':
      dueDate.setDate(dueDate.getDate() + 14)
      break
    case 'NET_30':
      dueDate.setDate(dueDate.getDate() + 30)
      break
    case 'INVOICE_ONLY':
      // For invoice only, default to 30 days but can be adjusted manually
      dueDate.setDate(dueDate.getDate() + 30)
      break
    default:
      // Default to Net 14
      dueDate.setDate(dueDate.getDate() + 14)
  }
  
  return dueDate
}

/**
 * Get payment terms label
 */
export function getPaymentTermsLabel(paymentTerms: string): string {
  switch (paymentTerms) {
    case 'NET_7':
      return 'Net 7 Days'
    case 'NET_14':
      return 'Net 14 Days'
    case 'NET_30':
      return 'Net 30 Days'
    case 'INVOICE_ONLY':
      return 'Invoice Only'
    default:
      return paymentTerms
  }
}

