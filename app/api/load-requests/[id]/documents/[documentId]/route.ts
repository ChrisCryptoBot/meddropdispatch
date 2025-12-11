import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * DELETE /api/load-requests/[id]/documents/[documentId]
 * Delete a document from a load request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: loadRequestId, documentId } = await params

    // Verify the document exists and belongs to this load
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        loadRequestId: loadRequestId,
      },
      select: {
        id: true,
        title: true,
        isLocked: true,
      }
    })

    if (!document) {
      throw new NotFoundError('Document')
    }

    // Check if document is locked (POD locking)
    if (document.isLocked) {
      return NextResponse.json(
        {
          error: 'Cannot delete document',
          message: 'This document is locked and cannot be deleted. Please contact an administrator.',
        },
        { status: 403 }
      )
    }

    // Delete the document
    await prisma.document.delete({
      where: { id: documentId }
    })

    logger.info('Document deleted', {
      documentId,
      loadRequestId,
      documentTitle: document.title,
    })

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    })
  })(request)
}

