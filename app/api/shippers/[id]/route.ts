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
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    const shipper = await prisma.shipper.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        shipperCode: true,
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
        smsNotificationsEnabled: true,
        smsPhoneNumber: true,
        subscriptionTier: true,
        dedicatedDispatcherId: true,
        deletedAt: true,
        deletedBy: true,
        deletedReason: true,
        createdAt: true,
        updatedAt: true,
        facilities: {
          select: {
            id: true,
            name: true,
            facilityType: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            contactName: true,
            contactPhone: true,
            defaultAccessNotes: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            loadRequests: true,
            facilities: true,
          },
        },
      },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    // Fetch dispatcher info if assigned
    let dispatcher = null
    if (shipper.dedicatedDispatcherId) {
      const dispatcherUser = await prisma.user.findUnique({
        where: { id: shipper.dedicatedDispatcherId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      })
      dispatcher = dispatcherUser
    }

    return NextResponse.json({ 
      shipper: {
        ...shipper,
        dispatcher,
      }
    })
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
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
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

/**
 * DELETE /api/shippers/[id]
 * Delete shipper account
 */
export async function DELETE(
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

    const { id } = await params

    // Get request body for deletion reason
    const body = await req.json().catch(() => ({}))
    const deletionReason = body.reason || body.deletionReason || 'Account deletion requested'

    // Check if shipper exists
    const shipper = await prisma.shipper.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loadRequests: {
              where: {
                status: {
                  notIn: ['DELIVERED', 'CANCELLED', 'COMPLETED', 'DENIED'],
                },
              },
            },
            invoices: {
              where: {
                status: {
                  notIn: ['PAID', 'CANCELLED'],
                },
              },
            },
          },
        },
      },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    // Check for active loads - warn but allow deletion (soft delete preserves data)
    if (shipper._count.loadRequests > 0) {
      // Log warning but proceed with soft delete
      console.warn(`Soft deleting shipper with ${shipper._count.loadRequests} active loads:`, id)
    }

    // Check for unpaid invoices - warn but allow deletion
    if (shipper._count.invoices > 0) {
      console.warn(`Soft deleting shipper with ${shipper._count.invoices} unpaid invoices:`, id)
    }

    // Soft delete: Set isActive to false and mark as deleted
    // This maintains the record for historical purposes but hides it from active lists
    // Cascade deletes will handle related records according to schema (onDelete: Cascade)
    const updatedShipper = await prisma.shipper.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: body.deletedBy || null, // Can be set if we track who deleted it
        deletedReason: deletionReason,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Shipper deactivated successfully',
      shipper: updatedShipper,
      warnings: {
        activeLoads: shipper._count.loadRequests,
        unpaidInvoices: shipper._count.invoices,
      },
    })
  })(request)
}
