import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthorizationError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { requireAuth } from '@/lib/authorization'
import { z } from 'zod'

const createAdjustmentSchema = z.object({
  type: z.enum(['CREDIT', 'DEBIT', 'DISPUTE_RESOLUTION', 'CORRECTION']),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
})

/**
 * POST /api/invoices/[id]/adjustments
 * Create an invoice adjustment (owner-operator or admin)
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
    if (auth.userType !== 'driver' && auth.userType !== 'admin') {
      throw new AuthorizationError('Unauthorized')
    }

    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        createdByDriver: true
      }
    })

    if (!invoice) {
      throw new NotFoundError('Invoice')
    }

    // Verify ownership (driver can only adjust their own invoices)
    if (auth.userType === 'driver') {
      if (!invoice.createdByDriverId || invoice.createdByDriverId !== auth.userId) {
        throw new AuthorizationError('You can only adjust your own invoices')
      }
    }

    // Validate request body
    const validation = createAdjustmentSchema.safeParse(rawData)
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

    // Create adjustment
    const adjustment = await prisma.invoiceAdjustment.create({
      data: {
        invoiceId: id,
        type: data.type,
        amount: data.type === 'CREDIT' ? data.amount : -data.amount, // Credits are positive, debits negative
        reason: data.reason,
        notes: data.notes || null,
        createdBy: auth.userId,
        createdByType: auth.userType === 'driver' ? 'DRIVER' : 'ADMIN',
      }
    })

    // Update invoice total
    const adjustments = await prisma.invoiceAdjustment.findMany({
      where: { invoiceId: id }
    })

    const adjustmentTotal = adjustments.reduce((sum, adj) => sum + adj.amount, 0)
    const newTotal = invoice.subtotal + invoice.tax + adjustmentTotal

    await prisma.invoice.update({
      where: { id },
      data: {
        total: newTotal
      }
    })

    return NextResponse.json({ adjustment }, { status: 201 })
  })(request)
}

