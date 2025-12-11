import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const paymentSettingsSchema = z.object({
  paymentMethod: z.enum(['ACH', 'CHECK']).optional(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  routingNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  accountType: z.enum(['checking', 'savings']).optional(),
  payoutFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
  minimumPayout: z.number().min(0).optional(),
  minimumRatePerMile: z.number().min(0).optional(),
  taxId: z.string().optional(),
  taxIdType: z.enum(['SSN', 'EIN']).optional(),
  w9Submitted: z.boolean().optional(),
})

/**
 * GET /api/drivers/[id]/payment-settings
 * Get driver payment settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        paymentMethod: true,
        bankName: true,
        accountHolderName: true,
        routingNumber: true,
        accountNumber: true,
        accountType: true,
        payoutFrequency: true,
        minimumPayout: true,
        minimumRatePerMile: true,
        taxId: true,
        taxIdType: true,
        w9Submitted: true,
      },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    return NextResponse.json({
      paymentSettings: {
        paymentMethod: driver.paymentMethod || 'ACH',
        bankName: driver.bankName || '',
        accountHolderName: driver.accountHolderName || '',
        routingNumber: driver.routingNumber || '',
        accountNumber: driver.accountNumber ? '***' + driver.accountNumber.slice(-4) : '', // Mask account number
        accountType: driver.accountType || 'checking',
        payoutFrequency: driver.payoutFrequency || 'WEEKLY',
        minimumPayout: driver.minimumPayout || 100,
        minimumRatePerMile: driver.minimumRatePerMile || 0,
        taxId: driver.taxId ? '***' + driver.taxId.slice(-4) : '', // Mask tax ID
        taxIdType: driver.taxIdType || 'SSN',
        w9Submitted: driver.w9Submitted || false,
      },
    })
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
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await req.json()

    // Validate request
    const validation = paymentSettingsSchema.safeParse(rawData)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid payment settings data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Build update data (only include provided fields)
    const updateData: any = {}
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod
    if (data.bankName !== undefined) updateData.bankName = data.bankName
    if (data.accountHolderName !== undefined) updateData.accountHolderName = data.accountHolderName
    if (data.routingNumber !== undefined) updateData.routingNumber = data.routingNumber
    if (data.accountNumber !== undefined) updateData.accountNumber = data.accountNumber
    if (data.accountType !== undefined) updateData.accountType = data.accountType
    if (data.payoutFrequency !== undefined) updateData.payoutFrequency = data.payoutFrequency
    if (data.minimumPayout !== undefined) updateData.minimumPayout = data.minimumPayout
    if (data.minimumRatePerMile !== undefined) updateData.minimumRatePerMile = data.minimumRatePerMile
    if (data.taxId !== undefined) updateData.taxId = data.taxId
    if (data.taxIdType !== undefined) updateData.taxIdType = data.taxIdType
    if (data.w9Submitted !== undefined) updateData.w9Submitted = data.w9Submitted

    // Update driver
    const updatedDriver = await prisma.driver.update({
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

    return NextResponse.json({
      success: true,
      paymentSettings: {
        paymentMethod: updatedDriver.paymentMethod || 'ACH',
        bankName: updatedDriver.bankName || '',
        accountHolderName: updatedDriver.accountHolderName || '',
        routingNumber: updatedDriver.routingNumber || '',
        accountNumber: updatedDriver.accountNumber ? '***' + updatedDriver.accountNumber.slice(-4) : '',
        accountType: updatedDriver.accountType || 'checking',
        payoutFrequency: updatedDriver.payoutFrequency || 'WEEKLY',
        minimumPayout: updatedDriver.minimumPayout || 100,
        taxId: updatedDriver.taxId ? '***' + updatedDriver.taxId.slice(-4) : '',
        taxIdType: updatedDriver.taxIdType || 'SSN',
        w9Submitted: updatedDriver.w9Submitted || false,
      },
    })
  })(request)
}
