import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers/[id]/payouts
 * Get payout history for a driver
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Build where clause
    const where: any = { driverId: id }
    if (status) {
      where.status = status
    }

    // Fetch payouts
    const [payouts, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        orderBy: { payoutDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payout.count({ where }),
    ])

    return NextResponse.json({
      payouts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  })(request)
}

/**
 * POST /api/drivers/[id]/payouts
 * Create a payout record (admin only - for manual payouts)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawBody = await req.json()
    
    // Validate required fields
    const { amount, paymentMethod, payoutDate, reference, notes } = rawBody

    if (!amount || amount <= 0) {
      throw new ValidationError('Valid amount is required')
    }

    if (!paymentMethod) {
      throw new ValidationError('Payment method is required')
    }

    if (!payoutDate) {
      throw new ValidationError('Payout date is required')
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // TODO: Add admin authentication check here
    // For now, allowing any authenticated user (will be restricted in production)

    // Create payout
    const payout = await prisma.payout.create({
      data: {
        driverId: id,
        amount: parseFloat(amount.toString()),
        paymentMethod,
        payoutDate: new Date(payoutDate),
        reference: reference || null,
        notes: notes || null,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ payout }, { status: 201 })
  })(request)
}

