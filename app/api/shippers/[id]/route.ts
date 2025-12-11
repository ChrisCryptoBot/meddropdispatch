import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { updateShipperSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/shippers/[id]
 * Get shipper details including billing information
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

    const shipper = await prisma.shipper.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        clientType: true,
        contactName: true,
        phone: true,
        email: true,
        isActive: true,
        paymentTerms: true,
        billingContactName: true,
        billingContactEmail: true,
        billingAddressLine1: true,
        billingAddressLine2: true,
        billingCity: true,
        billingState: true,
        billingPostalCode: true,
        stripeCustomerId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    return NextResponse.json({ shipper })
  })(request)
}

/**
 * PATCH /api/shippers/[id]
 * Update shipper details including billing information
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
    const validation = await validateRequest(updateShipperSchema, rawBody)
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

    // Only allow updating specific fields
    const {
      companyName,
      contactName,
      email,
      phone,
      paymentTerms,
      billingContactName,
      billingContactEmail,
      billingAddressLine1,
      billingAddressLine2,
      billingCity,
      billingState,
      billingPostalCode,
    } = body

    const updateData: any = {}

    if (companyName !== undefined) updateData.companyName = companyName
    if (contactName !== undefined) updateData.contactName = contactName
    if (email !== undefined) updateData.email = email.toLowerCase()
    if (phone !== undefined) updateData.phone = phone
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (billingContactName !== undefined) updateData.billingContactName = billingContactName || null
    if (billingContactEmail !== undefined) updateData.billingContactEmail = billingContactEmail || null
    if (billingAddressLine1 !== undefined) updateData.billingAddressLine1 = billingAddressLine1 || null
    if (billingAddressLine2 !== undefined) updateData.billingAddressLine2 = billingAddressLine2 || null
    if (billingCity !== undefined) updateData.billingCity = billingCity || null
    if (billingState !== undefined) updateData.billingState = billingState || null
    if (billingPostalCode !== undefined) updateData.billingPostalCode = billingPostalCode || null

    const shipper = await prisma.shipper.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        companyName: true,
        clientType: true,
        contactName: true,
        phone: true,
        email: true,
        isActive: true,
        paymentTerms: true,
        billingContactName: true,
        billingContactEmail: true,
        billingAddressLine1: true,
        billingAddressLine2: true,
        billingCity: true,
        billingState: true,
        billingPostalCode: true,
        stripeCustomerId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ shipper })
  })(request)
}

