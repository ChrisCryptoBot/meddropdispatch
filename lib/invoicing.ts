// Invoice Generation Library
// Handles invoice creation, PDF generation, and email sending

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface InvoiceData {
  invoiceNumber: string
  shipperId: string
  loadRequestIds: string[]
  invoiceDate: Date
  dueDate: Date
  subtotal: number
  tax: number
  total: number
  notes?: string
}

/**
 * Generate invoice number (e.g., INV-2024-001)
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`

  // Find the latest invoice for this year
  const latestInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  let nextNumber = 1
  if (latestInvoice) {
    const parts = latestInvoice.invoiceNumber.split('-')
    const lastPart = parts[parts.length - 1]
    const latestNumber = parseInt(lastPart) || 0
    nextNumber = latestNumber + 1
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`
}

/**
 * Calculate due date based on payment terms
 */
export function calculateDueDate(invoiceDate: Date, paymentTermsDays: number = 30): Date {
  const dueDate = new Date(invoiceDate)
  dueDate.setDate(dueDate.getDate() + paymentTermsDays)
  return dueDate
}

/**
 * Create invoice from load requests
 */
export async function createInvoice(
  shipperId: string,
  loadRequestIds: string[],
  options?: {
    invoiceDate?: Date
    paymentTermsDays?: number
    taxRate?: number
    notes?: string
  }
): Promise<InvoiceData> {
  // Get shipper
  const shipper = await prisma.shipper.findUnique({
    where: { id: shipperId },
  })

  if (!shipper) {
    throw new Error('Shipper not found')
  }

  // Get load requests
  const loadRequests = await prisma.loadRequest.findMany({
    where: {
      id: { in: loadRequestIds },
      shipperId,
      status: { in: ['DELIVERED', 'COMPLETED'] },
      quoteAmount: { not: null },
    },
  })

  if (loadRequests.length === 0) {
    throw new Error('No billable load requests found')
  }

  // Calculate subtotal
  const subtotal = loadRequests.reduce((sum, load) => {
    return sum + (load.quoteAmount || 0)
  }, 0)

  // Calculate tax (default 0%, can be configured)
  const taxRate = options?.taxRate || 0
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber()

  // Set dates
  const invoiceDate = options?.invoiceDate || new Date()
  const paymentTermsDays = options?.paymentTermsDays || 30
  const dueDate = calculateDueDate(invoiceDate, paymentTermsDays)

  // Create invoice in database
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      shipperId,
      invoiceDate,
      dueDate,
      subtotal,
      tax,
      total,
      status: 'DRAFT',
      notes: options?.notes || null,
      loadRequests: {
        connect: loadRequestIds.map((id) => ({ id })),
      },
    },
    include: {
      shipper: true,
      loadRequests: {
        include: {
          pickupFacility: true,
          dropoffFacility: true,
        },
      },
    },
  })

  // Update load requests with invoice ID
  await prisma.loadRequest.updateMany({
    where: {
      id: { in: loadRequestIds },
    },
    data: {
      invoiceId: invoice.id,
      invoicedAt: invoiceDate,
    },
  })

  return {
    invoiceNumber: invoice.invoiceNumber,
    shipperId: invoice.shipperId,
    loadRequestIds,
    invoiceDate,
    dueDate,
    subtotal,
    tax,
    total,
    notes: options?.notes,
  }
}

/**
 * Generate PDF invoice
 */
export async function generateInvoicePDF(invoiceId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      shipper: true,
      loadRequests: {
        include: {
          pickupFacility: true,
          dropoffFacility: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  })

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text('INVOICE', 20, 20)
  doc.setFontSize(12)
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 20, 30)
  doc.text(`Date: ${invoice.invoiceDate.toLocaleDateString()}`, 20, 36)
  doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, 20, 42)

  // Shipper info
  doc.setFontSize(14)
  doc.text('Bill To:', 20, 55)
  doc.setFontSize(10)
  doc.text(invoice.shipper.companyName, 20, 62)
  if (invoice.shipper.contactName) {
    doc.text(invoice.shipper.contactName, 20, 68)
  }
  doc.text(invoice.shipper.email, 20, 74)
  if (invoice.shipper.phone) {
    doc.text(invoice.shipper.phone, 20, 80)
  }

  // Load requests table
  const tableData = invoice.loadRequests.map((load) => [
    load.publicTrackingCode,
    load.pickupFacility.city + ', ' + load.pickupFacility.state,
    load.dropoffFacility.city + ', ' + load.dropoffFacility.state,
    load.serviceType.replace(/_/g, ' '),
    load.actualDeliveryTime
      ? new Date(load.actualDeliveryTime).toLocaleDateString()
      : 'N/A',
    `$${load.quoteAmount?.toFixed(2) || '0.00'}`,
  ])

  autoTable(doc, {
    head: [['Tracking Code', 'Pickup', 'Dropoff', 'Service', 'Delivery Date', 'Amount']],
    body: tableData,
    startY: 90,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  })

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(10)
  doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 150, finalY)
  if (invoice.tax > 0) {
    doc.text(`Tax: $${invoice.tax.toFixed(2)}`, 150, finalY + 6)
  }
  doc.setFontSize(12)
  doc.setFont(undefined, 'bold')
  doc.text(`Total: $${invoice.total.toFixed(2)}`, 150, finalY + 12)

  // Notes
  if (invoice.notes) {
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    doc.text('Notes:', 20, finalY + 25)
    doc.text(invoice.notes, 20, finalY + 32, { maxWidth: 170 })
  }

  // Footer
  doc.setFontSize(8)
  doc.text(
    'Thank you for your business!',
    105,
    doc.internal.pageSize.height - 20,
    { align: 'center' }
  )

  return Buffer.from(doc.output('arraybuffer'))
}

/**
 * Send invoice via email
 */
export async function sendInvoiceEmail(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      shipper: true,
    },
  })

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  // Generate PDF
  const pdfBuffer = await generateInvoicePDF(invoiceId)
  const pdfBase64 = pdfBuffer.toString('base64')

  // Send email
  await sendEmail({
    to: invoice.shipper.email,
    subject: `Invoice ${invoice.invoiceNumber} - MED DROP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Invoice ${invoice.invoiceNumber}</h2>
        <p>Dear ${invoice.shipper.companyName},</p>
        <p>Please find attached your invoice for medical courier services.</p>
        <p><strong>Invoice Date:</strong> ${invoice.invoiceDate.toLocaleDateString()}</p>
        <p><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> $${invoice.total.toFixed(2)}</p>
        <p>If you have any questions, please contact us.</p>
        <p>Thank you for your business!</p>
        <p>MED DROP</p>
      </div>
    `,
    attachments: [
      {
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf',
      },
    ],
  })

  // Update invoice status
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  })
}

/**
 * Auto-generate invoice for completed load
 */
export async function autoGenerateInvoiceForLoad(loadRequestId: string): Promise<string | null> {
  try {
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id: loadRequestId },
      include: {
        shipper: true,
      },
    })

    if (!loadRequest) {
      return null
    }

    // Only generate if load is completed and has a quote amount
    if (
      !['DELIVERED', 'COMPLETED'].includes(loadRequest.status) ||
      !loadRequest.quoteAmount ||
      loadRequest.invoiceId
    ) {
      return null
    }

    // Check if shipper has payment terms configured
    // For now, default to 30 days
    const paymentTermsDays = 30

    // Create invoice
    const invoiceData = await createInvoice(
      loadRequest.shipperId,
      [loadRequestId],
      {
        paymentTermsDays,
      }
    )

    // Auto-send invoice email
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: invoiceData.invoiceNumber },
    })

    if (invoice) {
      await sendInvoiceEmail(invoice.id)
    }

    return invoice?.id || null
  } catch (error) {
    console.error('Error auto-generating invoice:', error)
    return null
  }
}


