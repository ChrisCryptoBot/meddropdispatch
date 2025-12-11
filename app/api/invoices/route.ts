// Invoices API Route
// GET: List invoices
// POST: Create invoice (alternative endpoint)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createInvoice } from '@/lib/invoicing'

/**
 * GET /api/invoices
 * List invoices with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
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
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invoices
 * Create invoice (alternative to /api/invoices/generate)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shipperId, loadRequestIds, paymentTermsDays, taxRate, notes } = body

    if (!shipperId || !loadRequestIds || !Array.isArray(loadRequestIds) || loadRequestIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: shipperId, loadRequestIds' },
        { status: 400 }
      )
    }

    const invoiceData = await createInvoice(shipperId, loadRequestIds, {
      paymentTermsDays,
      taxRate,
      notes,
    })

    return NextResponse.json({
      success: true,
      invoice: invoiceData,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
