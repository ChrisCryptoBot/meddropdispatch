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
 * Accepts optional Prisma transaction client for atomic operations
 */
export async function createInvoice(
  shipperId: string,
  loadRequestIds: string[],
  options?: {
    invoiceDate?: Date
    paymentTermsDays?: number
    taxRate?: number
    notes?: string
  },
  txClient?: any // Prisma transaction client
): Promise<InvoiceData> {
  const prismaClient: any = txClient || prisma
  
  // Get shipper
  const shipper = await prismaClient.shipper.findUnique({
    where: { id: shipperId },
  })

  if (!shipper) {
    throw new Error('Shipper not found')
  }

  // Get load requests
  const loadRequests = await prismaClient.loadRequest.findMany({
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
  const subtotal = loadRequests.reduce((sum: number, load: any) => {
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
  const invoice = await prismaClient.invoice.create({
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

  // Update load requests with invoice ID (if not using transaction client)
  // Note: When using txClient, the caller is responsible for updating load requests
  if (!txClient) {
    await prismaClient.loadRequest.updateMany({
      where: {
        id: { in: loadRequestIds },
      },
      data: {
        invoiceId: invoice.id,
        invoicedAt: invoiceDate,
      },
    })
  }

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

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const invoiceUrl = `${baseUrl}/shipper/invoices`
  const supportEmail = 'meddrop.dispatch@outlook.com'
  const supportPhone = '(903) 914-0386'
  const dueDateFormatted = invoice.dueDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const invoiceDateFormatted = invoice.invoiceDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Send email
  await sendEmail({
    to: invoice.shipper.email,
    subject: `Invoice ${invoice.invoiceNumber} - MED DROP - Payment Due: $${invoice.total.toFixed(2)}`,
    text: `
Invoice ${invoice.invoiceNumber} - MED DROP

Dear ${invoice.shipper.companyName},

Please find attached your invoice for medical courier services.

INVOICE DETAILS:
Invoice Number: ${invoice.invoiceNumber}
Invoice Date: ${invoiceDateFormatted}
Due Date: ${dueDateFormatted}
Subtotal: $${invoice.subtotal.toFixed(2)}
${invoice.tax > 0 ? `Tax: $${invoice.tax.toFixed(2)}` : ''}
Total Amount Due: $${invoice.total.toFixed(2)}

PAYMENT INFORMATION:
This invoice reflects the negotiated rate for the completed delivery services. Payment terms are net 30 days from the invoice date.

Payment is due by: ${dueDateFormatted}

PAYMENT OPTIONS:
- ACH Transfer (preferred)
- Check
- Wire Transfer

For payment questions or to update payment information, please contact our billing department.

ACCESS YOUR INVOICES:
View and download this invoice, along with your complete invoice history:
${invoiceUrl}

SUPPORT:
If you have any questions about this invoice, please contact us:
- Email: ${supportEmail}
- Phone: ${supportPhone}
- Available 24/7 for urgent needs

Thank you for your business!

---
MED DROP
Medical Courier Services
Professional. Reliable. Trusted.
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 32px; font-weight: bold; }
    .header p { margin: 10px 0 0 0; opacity: 0.95; font-size: 16px; }
    .content { padding: 40px 30px; }
    .invoice-header { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center; }
    .invoice-number { font-size: 28px; font-weight: bold; color: #0369a1; margin: 10px 0; }
    .invoice-details-box { background: #f9fafb; border-left: 4px solid #0ea5e9; padding: 25px; margin: 25px 0; border-radius: 6px; }
    .invoice-detail-row { display: flex; justify-content: space-between; margin: 15px 0; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .invoice-detail-row:last-child { border-bottom: none; }
    .invoice-detail-label { font-weight: 600; color: #6b7280; }
    .invoice-detail-value { color: #111827; font-weight: 600; }
    .invoice-total-box { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 3px solid #0ea5e9; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center; }
    .invoice-total-label { font-size: 18px; color: #6b7280; margin-bottom: 10px; font-weight: 600; }
    .invoice-total-amount { font-size: 48px; font-weight: bold; color: #0369a1; }
    .payment-info { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 25px; margin: 25px 0; border-radius: 6px; }
    .payment-info h3 { margin: 0 0 15px 0; color: #92400e; }
    .payment-info ul { margin: 10px 0; padding-left: 20px; }
    .payment-info li { margin: 10px 0; color: #78350f; font-size: 16px; }
    .rate-note { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 6px; }
    .rate-note p { margin: 0; color: #047857; font-size: 15px; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; margin: 15px 10px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 4px 6px rgba(14, 165, 233, 0.2); }
    .button:hover { background: #0284c7; }
    .button-group { text-align: center; margin: 30px 0; }
    .support-box { background: #eff6ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 25px; margin: 25px 0; }
    .support-box h3 { margin: 0 0 15px 0; color: #0369a1; }
    .support-contact { margin: 12px 0; }
    .support-contact a { color: #0ea5e9; text-decoration: none; font-weight: 600; }
    .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 8px 0; }
    .footer a { color: #0ea5e9; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MED DROP</h1>
      <p>Medical Courier Services</p>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; color: #1e40af;">Invoice for Payment</h2>
      <p>Dear ${invoice.shipper.companyName},</p>
      <p>Please find attached your invoice for medical courier services. This invoice reflects the negotiated rate for completed delivery services.</p>

      <div class="invoice-header">
        <div style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Invoice Number</div>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
      </div>

      <div class="invoice-details-box">
        <h3 style="margin-top: 0; color: #0369a1; font-size: 20px;">Invoice Details</h3>
        <div class="invoice-detail-row">
          <div class="invoice-detail-label">Invoice Date</div>
          <div class="invoice-detail-value">${invoiceDateFormatted}</div>
        </div>
        <div class="invoice-detail-row">
          <div class="invoice-detail-label">Due Date</div>
          <div class="invoice-detail-value"><strong style="color: #dc2626;">${dueDateFormatted}</strong></div>
        </div>
        <div class="invoice-detail-row">
          <div class="invoice-detail-label">Subtotal</div>
          <div class="invoice-detail-value">$${invoice.subtotal.toFixed(2)}</div>
        </div>
        ${invoice.tax > 0 ? `
        <div class="invoice-detail-row">
          <div class="invoice-detail-label">Tax</div>
          <div class="invoice-detail-value">$${invoice.tax.toFixed(2)}</div>
        </div>
        ` : ''}
      </div>

      <div class="rate-note">
        <p><strong>📋 Rate Information:</strong> This invoice reflects the negotiated rate for the completed delivery services. Payment terms are net 30 days from the invoice date.</p>
      </div>

      <div class="invoice-total-box">
        <div class="invoice-total-label">Total Amount Due</div>
        <div class="invoice-total-amount">$${invoice.total.toFixed(2)}</div>
        <p style="margin-top: 15px; margin-bottom: 0; color: #6b7280; font-size: 16px;">Payment due by: <strong>${dueDateFormatted}</strong></p>
      </div>

      <div class="payment-info">
        <h3>💳 Payment Options</h3>
        <p style="margin-bottom: 15px; color: #78350f;">Please remit payment using one of the following methods:</p>
        <ul>
          <li><strong>ACH Transfer</strong> (preferred method) - Contact billing for account details</li>
          <li><strong>Check</strong> - Mail to address provided on invoice PDF</li>
          <li><strong>Wire Transfer</strong> - Contact billing department for wire instructions</li>
        </ul>
        <p style="margin-top: 15px; margin-bottom: 0; font-size: 14px; color: #78350f;">For payment questions or to update payment information, please contact our billing department.</p>
      </div>

      <div class="button-group">
        <a href="${invoiceUrl}" class="button">View Invoice Portal</a>
      </div>

      <div class="support-box">
        <h3>💬 Questions About This Invoice?</h3>
        <p style="margin-bottom: 15px; color: #1e40af;">If you have any questions about this invoice or need assistance, our support team is available:</p>
        <div class="support-contact">
          <strong>Email:</strong> <a href="mailto:${supportEmail}">${supportEmail}</a>
        </div>
        <div class="support-contact">
          <strong>Phone:</strong> <a href="tel:${supportPhone}">${supportPhone}</a>
        </div>
        <p style="margin-top: 15px; margin-bottom: 0; font-size: 14px; color: #6b7280;">Available 24/7 for urgent medical courier needs</p>
      </div>

      <p style="margin-top: 30px; font-size: 16px; color: #1e40af; text-align: center;"><strong>Thank you for your business!</strong></p>
    </div>

    <div class="footer">
      <p><strong>MED DROP</strong> - Professional Medical Courier Services</p>
      <p>Professional. Reliable. Trusted.</p>
      <p style="margin-top: 15px;">This invoice is attached as a PDF to this email for your records.</p>
      <p style="margin-top: 10px;">
        <a href="${invoiceUrl}">View Invoice Portal</a> | 
        <a href="${baseUrl}">Visit Website</a>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim(),
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
    // Use transaction to prevent duplicate invoice generation
    return await prisma.$transaction(async (tx) => {
      const loadRequest = await tx.loadRequest.findUnique({
        where: { id: loadRequestId },
        include: {
          shipper: true,
        },
      })

      if (!loadRequest) {
        return null
      }

      // Only generate if load is completed and has a quote amount
      // Double-check invoiceId within transaction to prevent race condition
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

      // Create invoice using transaction client
      const invoiceData = await createInvoice(
        loadRequest.shipperId,
        [loadRequestId],
        {
          paymentTermsDays,
        },
        tx // Pass transaction client
      )

      // Get the created invoice
      const invoice = await tx.invoice.findUnique({
        where: { invoiceNumber: invoiceData.invoiceNumber },
      })

      // Update load with invoice ID atomically within transaction
      if (invoice) {
        await tx.loadRequest.update({
          where: { id: loadRequestId },
          data: {
            invoiceId: invoice.id,
            invoicedAt: new Date(),
          },
        })
      }

      return invoice?.id || null
    })
  } catch (error) {
    console.error('Error auto-generating invoice:', error)
    return null
  }
}


