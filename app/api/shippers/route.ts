import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createShipperSchema, validateRequest, formatZodErrors } from '@/lib/validation'

/**
 * GET /api/shippers
 * Get all shippers (for admin use)
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const shippers = await prisma.shipper.findMany({
      select: {
        id: true,
        companyName: true,
        clientType: true,
        contactName: true,
        phone: true,
        email: true,
        isActive: true,
      },
      orderBy: { companyName: 'asc' },
    })

    return NextResponse.json({ shippers })
  })(request)
}

/**
 * POST /api/shippers
 * Create a new shipper (for admin use when documenting phone requests)
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const rawData = await req.json()
    
    // Validate request body
    const validation = await validateRequest(createShipperSchema, rawData)
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

    const data = validation.data

    // Check if shipper with this email already exists
    const existingShipper = await prisma.shipper.findUnique({
      where: { email: data.email.toLowerCase() },
    })

    if (existingShipper) {
      return NextResponse.json(
        {
          error: 'Shipper already exists',
          message: `A shipper with email ${data.email} already exists`,
          shipper: existingShipper,
        },
        { status: 409 }
      )
    }

    // Create shipper
    const shipper = await prisma.shipper.create({
      data: {
        companyName: data.companyName,
        clientType: data.clientType,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email.toLowerCase(),
        isActive: true,
      },
    })

    return NextResponse.json(
      { 
        shipper: {
          id: shipper.id,
          companyName: shipper.companyName,
          email: shipper.email,
        }
      },
      { status: 201 }
    )
  })(request)
}


