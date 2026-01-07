import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthorizationError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { requireAuth } from '@/lib/authorization'
import { z } from 'zod'

const createInvoiceSchema = z.object({
  loadRequestIds: z.array(z.string()).min(1, 'At least one load is required'),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().optional(),
    unitPrice: z.number(),
    notes: z.string().optional(),
  })).optional(),
  notes: z.string().optional(),
})

/**
 * POST /api/drivers/[id]/invoices
 * Create an invoice for completed loads (owner-operator)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await request.json()

    // Verify authentication
    const auth = await requireAuth(request)
    if (auth.userType !== 'driver' || auth.userId !== id) {
      throw new AuthorizationError('Unauthorized')
    }

    // Verify driver is admin (owner-operator)
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { isAdmin: true }
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    if (!driver.isAdmin) {
      throw new AuthorizationError('Only owner-operators can create invoices')
    }

    // Validate request body
    const validation = createInvoiceSchema.safeParse(rawData)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid request data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify all loads belong to driver and are completed
    const loads = await prisma.loadRequest.findMany({
      where: {
        id: { in: data.loadRequestIds },
        driverId: id,
        status: { in: ['DELIVERED', 'COMPLETED'] }
      },
      include: {
        shipper: true
      }
    })

    if (loads.length !== data.loadRequestIds.length) {
      throw new ValidationError('Some loads were not found or are not completed')
    }

    // Group loads by shipper (invoices are per shipper)
    const shipperGroups = new Map<string, typeof loads>()
    loads.forEach(load => {
      const shipperId = load.shipperId
      if (!shipperGroups.has(shipperId)) {
        shipperGroups.set(shipperId, [])
      }
      shipperGroups.get(shipperId)!.push(load)
    })

    // Create invoices for each shipper
    const invoices = []
    for (const [shipperId, shipperLoads] of shipperGroups.entries()) {
      const shipper = shipperLoads[0].shipper

      // Calculate subtotal from loads
      const loadSubtotal = shipperLoads.reduce((sum, load) => {
        return sum + (load.driverQuoteAmount || load.quoteAmount || 0)
      }, 0)

      // Calculate line items total
      const lineItemsTotal = (data.lineItems || []).reduce((sum, item) => {
        return sum + (item.quantity || 1) * item.unitPrice
      }, 0)

      const subtotal = loadSubtotal + lineItemsTotal
      const tax = 0 // Tax calculation can be added later
      const total = subtotal + tax

      // Generate invoice number
      const year = new Date().getFullYear()
      const invoiceCount = await prisma.invoice.count({
        where: {
          invoiceNumber: {
            startsWith: `INV-${year}-`
          }
        }
      })
      const invoiceNumber = `INV-${year}-${String(invoiceCount + 1).padStart(3, '0')}`

      // Calculate due date based on payment terms
      const paymentTerms = shipper.paymentTerms || 'NET_14'
      const days = paymentTerms === 'NET_7' ? 7 : paymentTerms === 'NET_30' ? 30 : 14
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + days)

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          shipperId,
          createdByDriverId: id,
          invoiceDate: new Date(),
          dueDate,
          subtotal,
          tax,
          total,
          status: 'DRAFT',
          notes: data.notes || null,
          loadRequests: {
            connect: shipperLoads.map(load => ({ id: load.id }))
          },
          lineItems: data.lineItems ? {
            create: data.lineItems.map(item => ({
              description: item.description,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice,
              total: (item.quantity || 1) * item.unitPrice,
              notes: item.notes || null,
            }))
          } : undefined,
        },
        include: {
          loadRequests: true,
          lineItems: true,
        }
      })

      // Update loads with invoice reference
      await prisma.loadRequest.updateMany({
        where: {
          id: { in: shipperLoads.map(l => l.id) }
        },
        data: {
          invoiceId: invoice.id,
          invoicedAt: new Date()
        }
      })

      invoices.push(invoice)
    }

    return NextResponse.json({ invoices }, { status: 201 })
  })(request)
}

