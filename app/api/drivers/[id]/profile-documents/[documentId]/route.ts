import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * PATCH /api/drivers/[id]/profile-documents/[documentId]
 * Update a profile document (title, expiry date, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id, documentId } = await params
    const body = await req.json()

    // Verify document belongs to driver
    const document = await prisma.driverDocument.findFirst({
      where: {
        id: documentId,
        driverId: id,
      },
    })

    if (!document) {
      throw new NotFoundError('Document')
    }

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.expiryDate !== undefined) updateData.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const updatedDocument = await prisma.driverDocument.update({
      where: { id: documentId },
      data: updateData,
    })

    return NextResponse.json({ document: updatedDocument })
  })(request)
}

/**
 * DELETE /api/drivers/[id]/profile-documents/[documentId]
 * Delete (deactivate) a profile document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    const { id, documentId } = await params

    // Verify document belongs to driver
    const document = await prisma.driverDocument.findFirst({
      where: {
        id: documentId,
        driverId: id,
      },
    })

    if (!document) {
      throw new NotFoundError('Document')
    }

    // Soft delete by setting isActive to false
    const updatedDocument = await prisma.driverDocument.update({
      where: { id: documentId },
      data: { isActive: false },
    })

    return NextResponse.json({ document: updatedDocument })
  })(request)
}

