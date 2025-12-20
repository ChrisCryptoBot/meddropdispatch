// Invoice PDF API Route
// GET: Download invoice PDF

import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePDF } from '@/lib/invoicing'

/**
 * GET /api/invoices/[id]/pdf
 * Download invoice PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const pdfBuffer = await generateInvoicePDF(id)

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF' },
      { status: 500 }
    )
  }
}
