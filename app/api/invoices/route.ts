// Invoices API Route
// GET: List invoices
// POST: Create invoice (alternative endpoint)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createInvoice } from '@/lib/invoicing'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { createInvoiceSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/invoices
 * List invoices with filters
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { searchParams } = new URL(req.url)
    const shipperId = searchParams.get('shipperId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (shipperId) {
      where.shipperId = shipperId
    }
    if (status) {
      where.status = status
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          shipper: {
            select: {
              id: true,
              companyName: true,
              email: true,
            },
          },
          loadRequests: {
            select: {
              id: true,
              publicTrackingCode: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.invoice.count({ where }),
    ])

    return NextResponse.json({
      invoices,
      total,
      limit,
      offset,
    })
  })(request)
}

/**
 * POST /api/invoices
 * Create invoice (alternative to /api/invoices/generate)
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const rawData = await req.json()

    // Validate request body
    const validation = await validateRequest(createInvoiceSchema, rawData)
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

    // TODO: Phase 0 Authorization Check - Require Admin or System?
    // For now assuming internal/admin use logic handled inside createInvoice or elsewhere
    // If strict admin required:
    // await requireAdmin(req as NextRequest)

    const invoiceData = await createInvoice(shipperId, loadRequestIds, {
      notes,
    })

    return NextResponse.json({
      success: true,
      invoice: invoiceData,
    }, { status: 201 })
  })(request)
}
