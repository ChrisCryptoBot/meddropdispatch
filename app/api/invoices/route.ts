import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoiceNumber, calculateDueDate } from '@/lib/invoice'

/**
 * POST /api/invoices
 * Create a new invoice for one or more loads
 */
export async function POST(request: NextRequest) {
  try {
    const { loadRequestIds, shipperId, invoiceDate, subtotal, tax, notes } = await request.json()

    if (!loadRequestIds || !Array.isArray(loadRequestIds) || loadRequestIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one load request ID is required' },
        { status: 400 }
      )
    }

    if (!shipperId) {
      return NextResponse.json(
        { error: 'Shipper ID is required' },
        { status: 400 }
      )
    }

    // Fetch shipper to get payment terms
    const shipper = await prisma.shipper.findUnique({
      where: { id: shipperId },
    })

    if (!shipper) {
      return NextResponse.json(
        { error: 'Shipper not found' },
        { status: 404 }
      )
    }

    // Verify all loads belong to this shipper and are delivered/completed
    const loads = await prisma.loadRequest.findMany({
      where: {
        id: { in: loadRequestIds },
        shipperId: shipperId,
      },
    })

    if (loads.length !== loadRequestIds.length) {
      return NextResponse.json(
        { error: 'Some load requests were not found or do not belong to this shipper' },
        { status: 400 }
      )
    }

    // Check if any loads are already invoiced
    const alreadyInvoiced = loads.filter(load => load.invoiceId !== null)
    if (alreadyInvoiced.length > 0) {
      return NextResponse.json(
        { error: 'Some loads are already invoiced' },
        { status: 400 }
      )
    }

    // Calculate totals if not provided
    let calculatedSubtotal = subtotal
    if (!calculatedSubtotal) {
      calculatedSubtotal = loads.reduce((sum, load) => sum + (load.quoteAmount || 0), 0)
    }

    const calculatedTax = tax || 0
    const calculatedTotal = calculatedSubtotal + calculatedTax

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber()

    // Calculate due date
    const invDate = invoiceDate ? new Date(invoiceDate) : new Date()
    const dueDate = calculateDueDate(invDate, shipper.paymentTerms)

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        shipperId,
        invoiceDate: invDate,
        dueDate,
        subtotal: calculatedSubtotal,
        tax: calculatedTax,
        total: calculatedTotal,
        status: 'DRAFT',
        notes: notes || null,
      },
    })

    // Link loads to invoice
    await prisma.loadRequest.updateMany({
      where: {
        id: { in: loadRequestIds },
      },
      data: {
        invoiceId: invoice.id,
        invoicedAt: new Date(),
      },
    })

    // Fetch full invoice with relations
    const fullInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
            email: true,
            billingContactEmail: true,
            billingContactName: true,
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
            id: true,
            publicTrackingCode: true,
            quoteAmount: true,
            actualDeliveryTime: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      invoice: fullInvoice,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/invoices
 * Get all invoices with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shipperId = searchParams.get('shipperId')
    const status = searchParams.get('status')

    const where: any = {}
    if (shipperId) where.shipperId = shipperId
    if (status) where.status = status

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
            email: true,
            paymentTerms: true,
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
        invoiceDate: 'desc',
      },
    })

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

