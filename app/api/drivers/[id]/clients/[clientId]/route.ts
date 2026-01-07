import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, AuthorizationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { requireAuth } from '@/lib/authorization'
import { z } from 'zod'

const updateClientSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(1).optional(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/drivers/[id]/clients/[clientId]
 * Get a specific client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; clientId: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id, clientId } = await params

    // Verify authentication
    const auth = await requireAuth(request)
    if (auth.userType !== 'driver' || auth.userId !== id) {
      throw new AuthorizationError('Unauthorized')
    }

    const client = await prisma.driverClient.findFirst({
      where: {
        id: clientId,
        driverId: id
      }
    })

    if (!client) {
      throw new NotFoundError('Client')
    }

    return NextResponse.json({ client })
  })(request)
}

/**
 * PATCH /api/drivers/[id]/clients/[clientId]
 * Update a client
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; clientId: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id, clientId } = await params
    const rawData = await request.json()

    // Verify authentication
    const auth = await requireAuth(request)
    if (auth.userType !== 'driver' || auth.userId !== id) {
      throw new AuthorizationError('Unauthorized')
    }

    // Verify client belongs to driver
    const existingClient = await prisma.driverClient.findFirst({
      where: {
        id: clientId,
        driverId: id
      }
    })

    if (!existingClient) {
      throw new NotFoundError('Client')
    }

    // Validate request body
    const validation = updateClientSchema.safeParse(rawData)
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

    // Update client
    const client = await prisma.driverClient.update({
      where: { id: clientId },
      data: {
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.addressLine1 !== undefined && { addressLine1: data.addressLine1 }),
        ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      }
    })

    return NextResponse.json({ client })
  })(request)
}

/**
 * DELETE /api/drivers/[id]/clients/[clientId]
 * Delete (deactivate) a client
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; clientId: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id, clientId } = await params

    // Verify authentication
    const auth = await requireAuth(request)
    if (auth.userType !== 'driver' || auth.userId !== id) {
      throw new AuthorizationError('Unauthorized')
    }

    // Verify client belongs to driver
    const existingClient = await prisma.driverClient.findFirst({
      where: {
        id: clientId,
        driverId: id
      }
    })

    if (!existingClient) {
      throw new NotFoundError('Client')
    }

    // Soft delete (deactivate)
    const client = await prisma.driverClient.update({
      where: { id: clientId },
      data: { isActive: false }
    })

    return NextResponse.json({ client })
  })(request)
}

