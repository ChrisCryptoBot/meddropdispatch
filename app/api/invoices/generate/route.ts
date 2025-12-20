// Invoice Generation API Route
// POST: Generate invoice for load requests

import { NextRequest, NextResponse } from 'next/server'
import { createInvoice } from '@/lib/invoicing'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { createInvoiceSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/invoices/generate
 * Generate invoice for load requests
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const rawBody = await req.json()
    
    // Validate request body
    const validation = await validateRequest(createInvoiceSchema, rawBody)
    if (!validation.success) {
      const formatted = formatZodErrors(validation.errors)
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: formatted.message,
          errors: formatted.errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const { shipperId, loadRequestIds, notes } = validation.data
    const paymentTermsDays = rawBody.paymentTermsDays
    const taxRate = rawBody.taxRate

    const invoiceData = await createInvoice(shipperId, loadRequestIds, {
      paymentTermsDays,
      taxRate,
      notes,
    })

    return NextResponse.json({
      success: true,
      invoice: invoiceData,
    }, { status: 201 })
  })(request)
}

