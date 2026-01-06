// Invoice PDF Generation

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface InvoicePDFData {
  invoiceNumber: string
  invoiceDate: Date | string
  dueDate: Date | string
  companyName: string
  billingAddress: {
    line1?: string | null
    line2?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
  }
  billingContact: {
    name?: string | null
    email?: string | null
  }
  loads: Array<{
    trackingCode: string
    description: string
    amount: number
    deliveryDate?: Date | string | null
  }>
  subtotal: number
  tax: number
  total: number
  paymentTerms: string
  notes?: string | null
}

/**
 * Generate invoice PDF
 */
export function generateInvoicePDF(data: InvoicePDFData): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPos = margin

  // Header
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('MED DROP', margin, yPos)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Medical Courier Services', margin, yPos + 7)
  doc.text('Invoice', margin, yPos + 14)

  // Invoice details (right side)
  doc.setFontSize(10)
  doc.text(`Invoice #: ${data.invoiceNumber}`, pageWidth - margin, yPos, { align: 'right' })
  doc.text(`Date: ${formatDate(data.invoiceDate)}`, pageWidth - margin, yPos + 7, { align: 'right' })
  doc.text(`Due Date: ${formatDate(data.dueDate)}`, pageWidth - margin, yPos + 14, { align: 'right' })

  yPos = 50

  // Bill To section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', margin, yPos)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  yPos += 7
  doc.text(data.companyName, margin, yPos)
  
  const billingAddress = formatBillingAddress(data.billingAddress)
  if (billingAddress.length > 0) {
    yPos += 6
    billingAddress.forEach((line) => {
      doc.text(line, margin, yPos)
      yPos += 6
    })
  }

  if (data.billingContact.name || data.billingContact.email) {
    yPos += 6
    if (data.billingContact.name) {
      doc.text(data.billingContact.name, margin, yPos)
      yPos += 6
    }
    if (data.billingContact.email) {
      doc.text(data.billingContact.email, margin, yPos)
    }
  }

  yPos = 90

  // Items table
  const tableData = data.loads.map((load) => [
    load.trackingCode,
    load.description,
    formatDate(load.deliveryDate) || 'N/A',
    formatCurrency(load.amount),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Tracking Code', 'Description', 'Delivery Date', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 80 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35, halign: 'right' },
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Totals (right aligned)
  doc.setFontSize(10)
  const totalsX = pageWidth - margin - 40
  let totalsY = finalY

  doc.text('Subtotal:', totalsX, totalsY, { align: 'right' })
  doc.text(formatCurrency(data.subtotal), pageWidth - margin, totalsY)
  totalsY += 7

  if (data.tax > 0) {
    doc.text('Tax:', totalsX, totalsY, { align: 'right' })
    doc.text(formatCurrency(data.tax), pageWidth - margin, totalsY)
    totalsY += 7
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Total:', totalsX, totalsY, { align: 'right' })
  doc.text(formatCurrency(data.total), pageWidth - margin, totalsY)

  totalsY += 15

  // Payment terms
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Payment Terms: ${getPaymentTermsLabel(data.paymentTerms)}`, margin, totalsY)

  // Notes
  if (data.notes) {
    totalsY += 10
    doc.setFontSize(9)
    doc.text('Notes:', margin, totalsY)
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 2 * margin)
    doc.text(splitNotes, margin, totalsY + 6)
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(
    'Thank you for choosing MED DROP for your medical courier needs.',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  )

  return doc
}

/**
 * Generate invoice PDF and return as base64 string
 */
export function generateInvoicePDFBase64(data: InvoicePDFData): string {
  const doc = generateInvoicePDF(data)
  return doc.output('datauristring')
}

/**
 * Generate invoice PDF and return as blob
 */
export function generateInvoicePDFBlob(data: InvoicePDFData): Blob {
  const doc = generateInvoicePDF(data)
  return doc.output('blob')
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatBillingAddress(address: InvoicePDFData['billingAddress']): string[] {
  const lines: string[] = []
  if (address.line1) lines.push(address.line1)
  if (address.line2) lines.push(address.line2)
  const cityStateZip = [address.city, address.state, address.postalCode].filter(Boolean).join(', ')
  if (cityStateZip) lines.push(cityStateZip)
  return lines
}

function getPaymentTermsLabel(terms: string): string {
  switch (terms) {
    case 'NET_7':
      return 'Net 7 Days'
    case 'NET_14':
      return 'Net 14 Days'
    case 'NET_30':
      return 'Net 30 Days'
    case 'INVOICE_ONLY':
      return 'Invoice Only'
    default:
      return terms
  }
}

