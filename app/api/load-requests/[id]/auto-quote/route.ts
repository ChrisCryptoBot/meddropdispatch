import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { generateAndSetQuote } from '@/lib/auto-quote-generator'
import { sendLoadStatusEmail } from '@/lib/email'
import { z } from 'zod'

const autoQuoteSchema = z.object({
  overrideAmount: z.number().positive().optional(),
})

/**
 * POST /api/load-requests/[id]/auto-quote
 * Generate and set automated quote for a load request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await nextReq.json().catch(() => ({}))
    const validation = autoQuoteSchema.safeParse(rawData)

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

    const { overrideAmount } = validation.data

    // Verify load request exists
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Check if load is in a valid state for quoting
    if (loadRequest.status === 'DELIVERED' || loadRequest.status === 'COMPLETED' || loadRequest.status === 'CANCELLED') {
      return NextResponse.json(
        {
          error: 'Cannot generate quote',
          message: `Cannot generate quote for load with status: ${loadRequest.status}`,
        },
        { status: 400 }
      )
    }

    // Generate and set quote
    const result = await generateAndSetQuote(id, overrideAmount)

    // Send email notification to shipper if quote was generated successfully
    if (result.quoteAmount > 0) {
      try {
        const trackingUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/track/${loadRequest.publicTrackingCode}`
        
        await sendLoadStatusEmail({
          to: loadRequest.shipper.email,
          companyName: loadRequest.shipper.companyName,
          trackingCode: loadRequest.publicTrackingCode,
          status: 'QUOTED',
          statusLabel: 'Quote Ready',
          trackingUrl,
          quoteAmount: result.quoteAmount,
        })
      } catch (emailError) {
        // Log error but don't fail the request
        console.error('Error sending quote email:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      quoteAmount: result.quoteAmount,
      quoteNotes: result.quoteNotes,
      loadRequest: result.loadRequest,
      message: 'Quote generated and set successfully',
    })
  })(request)
}

/**
 * GET /api/load-requests/[id]/auto-quote
 * Preview quote without setting it (for admin review)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    // Verify load request exists
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    // Import generateAutoQuote (don't set the quote, just preview)
    const { generateAutoQuote } = await import('@/lib/auto-quote-generator')
    const quoteResult = await generateAutoQuote(id)

    return NextResponse.json({
      success: true,
      preview: quoteResult,
      message: 'Quote preview generated',
    })
  })(request)
}

