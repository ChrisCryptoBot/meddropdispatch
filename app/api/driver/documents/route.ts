import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createHash } from 'crypto'

/**
 * POST /api/driver/documents
 * Save document metadata to database after upload
 * 
 * Requires: driver authentication
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const nextReq = req as NextRequest
    
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    // TODO: Add driver authentication check
    // const driver = await getAuthenticatedDriver(nextReq)
    // if (!driver) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    const body = await nextReq.json()
    const { driverId, type, title, url, mimeType, fileSize, expiryDate } = body

    // Validate required fields
    if (!driverId || !type || !title || !url) {
      throw new ValidationError('driverId, type, title, and url are required')
    }

    // Validate document type
    const validTypes = [
      'DRIVERS_LICENSE',
      'VEHICLE_INSURANCE',
      'VEHICLE_REGISTRATION',
      'HIPAA_CERTIFICATE',
      'UN3373_CERTIFICATE',
      'W9_FORM',
      'OTHER'
    ]

    if (!validTypes.includes(type)) {
      throw new ValidationError(`Invalid document type. Must be one of: ${validTypes.join(', ')}`)
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    // Calculate file hash if we have the file data
    // For now, we'll use URL as a simple identifier
    const fileHash = url ? createHash('sha256').update(url).digest('hex') : null

    // Create document record
    const document = await prisma.driverDocument.create({
      data: {
        driverId,
        type,
        title,
        url,
        mimeType: mimeType || null,
        fileSize: fileSize || null,
        fileHash,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive: true,
      }
    })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        title: document.title,
        url: document.url,
        expiryDate: document.expiryDate,
        createdAt: document.createdAt,
      }
    }, { status: 201 })
  })(request)
}

/**
 * GET /api/driver/documents
 * Get all documents for a driver
 * 
 * Query params: driverId (required)
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const nextReq = req as NextRequest
    
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { searchParams } = new URL(nextReq.url)
    const driverId = searchParams.get('driverId')

    if (!driverId) {
      return NextResponse.json(
        { error: 'driverId query parameter is required' },
        { status: 400 }
      )
    }

    // TODO: Add driver authentication check
    // Verify the requesting driver matches driverId
    // const driver = await getAuthenticatedDriver(nextReq)
    // if (!driver || driver.id !== driverId) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    // Get all active documents for driver
    const documents = await prisma.driverDocument.findMany({
      where: {
        driverId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      documents: documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        url: doc.url,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        expiryDate: doc.expiryDate,
        verifiedBy: doc.verifiedBy,
        verifiedAt: doc.verifiedAt,
        notes: doc.notes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }))
    })
  })(request)
}

/**
 * DELETE /api/driver/documents/[id]
 * Soft delete a document (set isActive to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const nextReq = req as NextRequest
    
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    // TODO: Add driver authentication check
    // Verify driver owns this document

    // Soft delete document
    const document = await prisma.driverDocument.update({
      where: { id },
      data: {
        isActive: false,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })
  })(request)
}










