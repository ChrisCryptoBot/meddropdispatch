import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthorizationError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { requireAuth } from '@/lib/authorization'
import { z } from 'zod'

const createClientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(1, 'Phone is required'),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

/**
 * GET /api/drivers/[id]/clients
 * Get all private clients for a driver
 */
export async function GET(
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

    // Verify authentication
    const auth = await requireAuth(request)
    if (auth.userType !== 'driver' || auth.userId !== id) {
      throw new AuthorizationError('Unauthorized')
    }

    const clients = await prisma.driverClient.findMany({
      where: {
        driverId: id,
        isActive: true
      },
      orderBy: {
        companyName: 'asc'
      }
    })

    return NextResponse.json({ clients })
  })(request)
}

/**
 * POST /api/drivers/[id]/clients
 * Create a new private client for a driver
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
      throw new AuthorizationError('Only owner-operators can manage private clients')
    }

    // Validate request body
    const validation = createClientSchema.safeParse(rawData)
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

    // Create client
    const client = await prisma.driverClient.create({
      data: {
        driverId: id,
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email || null,
        phone: data.phone,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        city: data.city || null,
        state: data.state || null,
        postalCode: data.postalCode || null,
        notes: data.notes || null,
      }
    })

    return NextResponse.json({ client }, { status: 201 })
  })(request)
}

