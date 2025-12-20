import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/upload
 * Upload a file to Vercel Blob storage
 * 
 * Requires authentication (driver must be logged in)
 * Accepts: PDF, JPG, PNG files up to 10MB
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const nextReq = req as NextRequest
    
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.upload)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    // TODO: Add driver authentication check
    // For now, we'll allow uploads but should verify driver is logged in
    // const driver = await getAuthenticatedDriver(nextReq)
    // if (!driver) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }

    const formData = await nextReq.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File size exceeds limit',
          message: `File size must be less than 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
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
    ]
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    const isValidType = validMimeTypes.includes(file.type) || validExtensions.includes(fileExtension)
    
    if (!isValidType) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: `File type "${file.type || 'unknown'}" is not supported. Please upload a PDF or image file (PDF, JPG, PNG).`
        },
        { status: 400 }
      )
    }

    try {
      // Upload to Vercel Blob
      const blob = await put(file.name, file, {
        access: 'public',
        contentType: file.type,
      })

      return NextResponse.json({
        success: true,
        url: blob.url,
        pathname: blob.pathname,
        size: file.size, // Use file size instead of blob.size
        uploadedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error uploading file to Vercel Blob:', error)
      return NextResponse.json(
        {
          error: 'Upload failed',
          message: error instanceof Error ? error.message : 'Failed to upload file'
        },
        { status: 500 }
      )
    }
  })(request)
}





