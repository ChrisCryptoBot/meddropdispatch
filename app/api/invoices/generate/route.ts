// Invoice Generation API Route
// POST: Generate invoice for load requests

import { NextRequest, NextResponse } from 'next/server'
import { createInvoice } from '@/lib/invoicing'

/**
 * POST /api/invoices/generate
 * Generate invoice for load requests
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
    console.error('Error generating invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}

