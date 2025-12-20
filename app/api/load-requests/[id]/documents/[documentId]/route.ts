import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { createHash } from 'crypto'

/**
 * DELETE /api/load-requests/[id]/documents/[documentId]
 * Delete a document from a load request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
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

/**
 * PATCH /api/load-requests/[id]/documents/[documentId]
 * Replace a document (archive old, create new)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.upload)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: loadRequestId, documentId } = await params
    const formData = await nextReq.formData()

    // Get old document
    const oldDocument = await prisma.document.findFirst({
      where: {
        id: documentId,
        loadRequestId: loadRequestId,
      },
    })

    if (!oldDocument) {
      throw new NotFoundError('Document')
    }

    // Check if document is locked (POD locking) - locked documents can only be replaced with admin override
    const adminOverride = formData.get('adminOverride') === 'true'
    const adminOverrideBy = formData.get('adminOverrideBy') as string | null
    const adminOverrideNotes = formData.get('adminOverrideNotes') as string | null

    if (oldDocument.isLocked && !adminOverride) {
      return NextResponse.json(
        {
          error: 'Cannot replace document',
          message: 'This document is locked and cannot be replaced. Please contact an administrator.',
          requiresAdminOverride: true,
        },
        { status: 403 }
      )
    }

    // Get new file
    const file = formData.get('file') as File
    const title = (formData.get('title') as string) || oldDocument.title
    const documentType = (formData.get('type') as string) || oldDocument.type
    const uploadedBy = (formData.get('uploadedBy') as string) || oldDocument.uploadedBy || 'driver'

    if (!file) {
      throw new ValidationError('File is required for document replacement')
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File size exceeds limit',
          message: `File size must be less than 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
        },
        { status: 400 }
      )
    }

    // Validate file type
    const validMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
    ]
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.heic']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    const isValidType = validMimeTypes.includes(file.type) || validExtensions.includes(fileExtension)

    if (!isValidType) {
      throw new ValidationError(
        `File type "${file.type || 'unknown'}" is not supported. Please upload a PDF or image file (PDF, JPG, PNG, HEIC).`
      )
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Calculate SHA-256 hash
    const fileHash = createHash('sha256').update(buffer).digest('hex')

    // Archive old document
    await prisma.document.update({
      where: { id: documentId },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    })

    // Create new document
    const newDocument = await prisma.document.create({
      data: {
        loadRequestId: loadRequestId,
        type: documentType,
        title: title,
        url: dataUrl,
        mimeType: file.type,
        fileSize: file.size,
        fileHash: fileHash,
        uploadedBy: uploadedBy,
        isLocked: oldDocument.isLocked, // Preserve lock status
        lockedAt: oldDocument.lockedAt,
        adminOverride: adminOverride || oldDocument.adminOverride,
        adminOverrideBy: adminOverrideBy || oldDocument.adminOverrideBy,
        adminOverrideNotes: adminOverrideNotes || oldDocument.adminOverrideNotes,
        replacedBy: null, // This is the replacement, not replacing anything
      },
    })

    // Update old document to reference the new one
    await prisma.document.update({
      where: { id: documentId },
      data: {
        replacedBy: newDocument.id,
      },
    })

    logger.info('Document replaced', {
      oldDocumentId: documentId,
      newDocumentId: newDocument.id,
      loadRequestId: loadRequestId,
      title: title,
    })

    return NextResponse.json({
      success: true,
      message: 'Document replaced successfully',
      document: newDocument,
      oldDocumentId: documentId,
    })
  })(request)
}

