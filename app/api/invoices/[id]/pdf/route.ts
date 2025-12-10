import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoicePDF } from '@/lib/pdf-invoice'

/**
 * GET /api/invoices/[id]/pdf
 * Generate and return invoice PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        shipper: {
          select: {
            companyName: true,
            billingContactName: true,
            billingContactEmail: true,
            billingAddressLine1: true,
            billingAddressLine2: true,
            billingCity: true,
            billingState: true,
            billingPostalCode: true,
            paymentTerms: true,
          },
        },
        loadRequests: {
          select: {
            publicTrackingCode: true,
            commodityDescription: true,
            quoteAmount: true,
            actualDeliveryTime: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Prepare PDF data
    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      companyName: invoice.shipper.companyName,
      billingAddress: {
        line1: invoice.shipper.billingAddressLine1,
        line2: invoice.shipper.billingAddressLine2,
        city: invoice.shipper.billingCity,
        state: invoice.shipper.billingState,
        postalCode: invoice.shipper.billingPostalCode,
      },
      billingContact: {
        name: invoice.shipper.billingContactName,
        email: invoice.shipper.billingContactEmail,
      },
      loads: invoice.loadRequests.map((load) => ({
        trackingCode: load.publicTrackingCode,
        description: load.commodityDescription,
        amount: load.quoteAmount || 0,
        deliveryDate: load.actualDeliveryTime,
      })),
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      paymentTerms: invoice.shipper.paymentTerms,
      notes: invoice.notes,
    }

    // Generate PDF
    const doc = generateInvoicePDF(pdfData)
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating invoice PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

