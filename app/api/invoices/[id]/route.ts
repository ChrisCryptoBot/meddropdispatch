// Single Invoice API Route
// GET: Get invoice details
// PATCH: Update invoice (e.g., mark as paid)
// DELETE: Delete invoice (soft delete)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoicePDF, sendInvoiceEmail } from '@/lib/invoicing'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { updateInvoiceSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/invoices/[id]
 * Get invoice details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        shipper: true,
        loadRequests: {
          include: {
            pickupFacility: true,
            dropoffFacility: true,
          },
        },
        adjustments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!invoice) {
      throw new NotFoundError('Invoice')
    }

    return NextResponse.json(invoice)
  })(request)
}

/**
 * PATCH /api/invoices/[id]
 * Update invoice (e.g., mark as paid, update status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawBody = await req.json()
    
    // Validate request body
    const validation = await validateRequest(updateInvoiceSchema, rawBody)
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

    const body = validation.data

    const invoice = await prisma.invoice.update({
      where: { id },
      data: body,
      include: {
        shipper: true,
        loadRequests: true,
      },
    })

    return NextResponse.json(invoice)
  })(request)
}

/**
 * DELETE /api/invoices/[id]
 * Delete invoice (soft delete by setting status to CANCELLED)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ success: true, invoice })
  })(request)
}
