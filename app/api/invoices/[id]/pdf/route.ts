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

    // AUDIT LOGGING: HIPAA Compliance - Log PDF Export
    try {
      const { getAuthSession } = await import('@/lib/auth-session')
      const { logUserAction } = await import('@/lib/audit-log')
      const auth = await getAuthSession(request as any)

      if (auth) {
        await logUserAction('EXPORT', 'INVOICE', {
          entityId: id,
          userId: auth.userId,
          userType: auth.userType === 'driver' ? 'DRIVER' : auth.userType === 'shipper' ? 'SHIPPER' : 'ADMIN',
          req: request,
          metadata: {
            exportType: 'invoice_pdf',
            fileFormat: 'PDF'
          },
          severity: 'INFO',
          success: true
        })
      }
    } catch (logError) {
      console.error('Failed to log PDF export:', logError)
    }

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
