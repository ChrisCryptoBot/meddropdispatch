// Batch Invoice Generation API Route
// POST: Generate invoices for multiple shippers

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createInvoice } from '@/lib/invoicing'

/**
 * POST /api/invoices/batch
 * Generate invoices for all completed loads that haven't been invoiced
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shipperId, paymentTermsDays, taxRate } = body

    // Find all completed loads without invoices
    const where: any = {
      status: { in: ['DELIVERED'] },
      quoteAmount: { not: null },
      invoiceId: null,
    }

    if (shipperId) {
      where.shipperId = shipperId
    }

    const loadRequests = await prisma.loadRequest.findMany({
      where,
      include: {
        shipper: true,
      },
    })

    if (loadRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No loads to invoice',
        invoicesGenerated: 0,
      })
    }

    // Group by shipper
    const loadsByShipper = new Map<string, typeof loadRequests>()
    for (const load of loadRequests) {
      if (!loadsByShipper.has(load.shipperId)) {
        loadsByShipper.set(load.shipperId, [])
      }
      loadsByShipper.get(load.shipperId)!.push(load)
    }

    // Generate invoices
    const invoicesGenerated: string[] = []
    for (const [shipperId, loads] of loadsByShipper.entries()) {
      try {
        const loadIds = loads.map((l) => l.id)
        const invoiceData = await createInvoice(shipperId, loadIds, {
          paymentTermsDays,
          taxRate,
        })
        invoicesGenerated.push(invoiceData.invoiceNumber)
      } catch (error) {
        console.error(`Error generating invoice for shipper ${shipperId}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      invoicesGenerated: invoicesGenerated.length,
      invoiceNumbers: invoicesGenerated,
    })
  } catch (error) {
    console.error('Error generating batch invoices:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate batch invoices' },
      { status: 500 }
    )
  }
}


