import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { requireDriver, verifyDriverAccess } from '@/lib/authorization'
import { logger } from '@/lib/logger'

/**
 * GET /api/drivers/[id]/payouts
 * Get payout history for a driver
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: driverId } = await params
    const nextReq = req as NextRequest

    // Verify driver access (drivers can only view their own payouts)
    await verifyDriverAccess(nextReq, driverId)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = { driverId }
    if (status && status !== 'all') {
      where.status = status
    }

    // Get payouts with related load/invoice info
    const [payouts, total] = await Promise.all([
      prisma.driverPayment.findMany({
        where,
        include: {
          loadRequest: {
            select: {
              id: true,
              publicTrackingCode: true,
              quoteAmount: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.driverPayment.count({ where }),
    ])

    return NextResponse.json({
      payouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  })(request)
}

/**
 * POST /api/drivers/[id]/payouts
 * Create a new payout record (admin only, for tracking manual payments)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: driverId } = await params

    // Require admin authentication
    const { requireAdmin } = await import('@/lib/authorization')
    await requireAdmin(request)

    const rawData = await req.json()

    // Validate required fields
    if (!rawData.amount || !rawData.paymentDate || !rawData.paymentMethod) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Amount, paymentDate, and paymentMethod are required',
        },
        { status: 400 }
      )
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Create payout record
    const payout = await prisma.driverPayment.create({
      data: {
        driverId,
        amount: parseFloat(rawData.amount),
        paymentDate: new Date(rawData.paymentDate),
        paymentMethod: rawData.paymentMethod,
        paymentReference: rawData.paymentReference || null,
        status: rawData.status || 'COMPLETED',
        notes: rawData.notes || null,
        loadRequestId: rawData.loadRequestId || null,
        invoiceId: rawData.invoiceId || null,
      },
      include: {
        loadRequest: {
          select: {
            id: true,
            publicTrackingCode: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
    })

    logger.info('Payout created', {
      payoutId: payout.id,
      driverId,
      amount: payout.amount,
      paymentMethod: payout.paymentMethod,
    })

    return NextResponse.json({ payout }, { status: 201 })
  })(request)
}

