// Send Invoice Email API Route
// POST: Send invoice via email

import { NextRequest, NextResponse } from 'next/server'
import { sendInvoiceEmail } from '@/lib/invoicing'

/**
 * POST /api/invoices/[id]/send
 * Send invoice via email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await sendInvoiceEmail(id)

    return NextResponse.json({
      success: true,
      message: 'Invoice sent successfully',
    })
  } catch (error) {
    console.error('Error sending invoice email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invoice' },
      { status: 500 }
    )
  }
}


