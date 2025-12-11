import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { driverPaymentSettingsSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers/[id]/payment-settings
 * Get driver payment settings
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

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        paymentMethod: true,
        bankName: true,
        accountHolderName: true,
        routingNumber: true,
        accountNumber: true,
        accountType: true,
        payoutFrequency: true,
        minimumPayout: true,
        taxId: true,
        taxIdType: true,
        w9Submitted: true,
      },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    return NextResponse.json({ paymentSettings: driver })
  })(request)
}

/**
 * PATCH /api/drivers/[id]/payment-settings
 * Update driver payment settings
 */
export async function PATCH(
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
    
    // Validate request body
    const validation = await validateRequest(driverPaymentSettingsSchema, rawBody)
    if (!validation.success) {
      const formatted = formatZodErrors(validation.errors)
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: formatted.message,
          errors: formatted.errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const body = validation.data

    const updateData: any = {}

    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod || null
    if (body.bankName !== undefined) updateData.bankName = body.bankName || null
    if (body.accountHolderName !== undefined) updateData.accountHolderName = body.accountHolderName || null
    if (body.routingNumber !== undefined) updateData.routingNumber = body.routingNumber || null
    if (body.accountNumber !== undefined) updateData.accountNumber = body.accountNumber || null
    if (body.accountType !== undefined) updateData.accountType = body.accountType || null
    if (body.payoutFrequency !== undefined) updateData.payoutFrequency = body.payoutFrequency || null
    if (body.minimumPayout !== undefined) updateData.minimumPayout = body.minimumPayout || null
    if (body.taxId !== undefined) updateData.taxId = body.taxId || null
    if (body.taxIdType !== undefined) updateData.taxIdType = body.taxIdType || null
    if (body.w9Submitted !== undefined) updateData.w9Submitted = body.w9Submitted

    const driver = await prisma.driver.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        paymentMethod: true,
        bankName: true,
        accountHolderName: true,
        routingNumber: true,
        accountNumber: true,
        accountType: true,
        payoutFrequency: true,
        minimumPayout: true,
        taxId: true,
        taxIdType: true,
        w9Submitted: true,
      },
    })

    return NextResponse.json({ paymentSettings: driver })
  })(request)
}

