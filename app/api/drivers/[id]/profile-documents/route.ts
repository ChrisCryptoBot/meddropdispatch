import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'
import { createHash } from 'crypto'

const documentTypes = [
  'DRIVERS_LICENSE',
  'VEHICLE_INSURANCE',
  'VEHICLE_REGISTRATION',
  'HIPAA_CERTIFICATE',
  'UN3373_CERTIFICATE',
  'W9_FORM',
  'OTHER',
] as const

const uploadDocumentSchema = z.object({
  type: z.enum(documentTypes),
  title: z.string().min(1, 'Title is required'),
  expiryDate: z.string().datetime().optional().nullable(),
})

/**
 * GET /api/drivers/[id]/profile-documents
 * Get all profile documents for a driver
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const { id } = await params

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    const documents = await prisma.driverDocument.findMany({
      where: { driverId: id },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ documents })
  })(request)
}

/**
 * POST /api/drivers/[id]/profile-documents
 * Upload a profile document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.upload)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const formData = await req.formData()

    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const title = formData.get('title') as string
    const expiryDate = formData.get('expiryDate') as string | null

    if (!file || !type || !title) {
      throw new ValidationError('File, type, and title are required')
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

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Convert file to base64 for storage (in production, use S3/Blob storage)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Calculate file hash
    const hash = createHash('sha256').update(buffer).digest('hex')

    // Create document
    const document = await prisma.driverDocument.create({
      data: {
        driverId: id,
        type,
        title,
        url: dataUrl,
        mimeType: file.type,
        fileSize: file.size,
        fileHash: hash,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  })(request)
}

