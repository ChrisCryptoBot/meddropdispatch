import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/invoices/[id]
 * Get invoice details
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
            id: true,
            companyName: true,
            email: true,
            contactName: true,
            phone: true,
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
          include: {
            pickupFacility: true,
            dropoffFacility: true,
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
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

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/invoices/[id]
 * Update invoice (mark as sent, paid, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      status,
      sentAt,
      paidAt,
      paymentMethod,
      paymentReference,
      notes,
    } = body

    const updateData: any = {}

    if (status !== undefined) {
      updateData.status = status
      
      // Auto-set timestamps based on status
      if (status === 'SENT' && !sentAt) {
        updateData.sentAt = new Date()
      }
      if (status === 'PAID' && !paidAt) {
        updateData.paidAt = new Date()
      }
    }
    if (sentAt !== undefined) updateData.sentAt = sentAt ? new Date(sentAt) : null
    if (paidAt !== undefined) updateData.paidAt = paidAt ? new Date(paidAt) : null
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod || null
    if (paymentReference !== undefined) updateData.paymentReference = paymentReference || null
    if (notes !== undefined) updateData.notes = notes || null

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
            email: true,
            billingContactEmail: true,
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
    })

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

