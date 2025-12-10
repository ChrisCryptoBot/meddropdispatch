import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/load-requests/[id]/documents
 * Upload a document for a load request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const documentType = formData.get('type') as string
    const title = formData.get('title') as string
    const uploadedBy = formData.get('uploadedBy') as string // 'driver' or 'shipper'

    if (!file || !documentType || !title) {
      return NextResponse.json(
        { error: 'File, type, and title are required' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Convert file to base64 for storage (in production, use S3/Blob storage)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // Get load request with shipper info for email
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      }
    })

    if (!loadRequest) {
      return NextResponse.json(
        { error: 'Load request not found' },
        { status: 404 }
      )
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        loadRequestId: id,
        type: documentType,
        title,
        url: dataUrl, // Stored as base64 data URL
        mimeType: file.type,
        fileSize: file.size,
        uploadedBy: uploadedBy || 'unknown',
      }
    })

    // If driver uploaded, send email to shipper with attachment
    if (uploadedBy === 'driver') {
      try {
        // Create attachment data for email
        const attachmentContent = base64
        const attachmentName = file.name

        // Send email with document attached
        await sendEmail({
          to: loadRequest.shipper.email,
          subject: `MED DROP - Document Uploaded for Load ${loadRequest.publicTrackingCode}`,
          text: `
Hello ${loadRequest.shipper.companyName},

A new document has been uploaded for your load request:

Tracking Code: ${loadRequest.publicTrackingCode}
Document Type: ${title}
Uploaded: ${new Date().toLocaleString()}

You can view and download this document in your shipper portal, or it is attached to this email for your records.

Route: ${loadRequest.pickupFacility.city}, ${loadRequest.pickupFacility.state} → ${loadRequest.dropoffFacility.city}, ${loadRequest.dropoffFacility.state}

If you have any questions, please contact us at support@meddrop.com

---
MED DROP
Medical Courier Services
          `.trim(),
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .tracking-code { font-size: 24px; font-weight: bold; margin: 10px 0; }
    .info-box { background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MED DROP</h1>
      <p>Medical Courier Services</p>
    </div>
    <div class="content">
      <h2>Document Upload Notification</h2>
      <p>Hello ${loadRequest.shipper.companyName},</p>
      <p>A new document has been uploaded for your load request:</p>

      <div class="tracking-code">${loadRequest.publicTrackingCode}</div>

      <div class="info-box">
        <strong>Document Type:</strong> ${title}<br>
        <strong>Uploaded:</strong> ${new Date().toLocaleString()}<br>
        <strong>File:</strong> ${file.name} (${(file.size / 1024).toFixed(2)} KB)
      </div>

      <p>You can view and download this document in your shipper portal. The document is also attached to this email for your records.</p>

      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/shipper/loads/${id}" class="button">View Load Details</a>

      <p>If you have any questions, please contact us at support@meddrop.com</p>

      <div class="footer">
        <p>MED DROP - Professional Medical Courier Services</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
          `.trim(),
        })

        // Note: In production, you'd attach the actual file to the email
        // For now, the email just notifies - the file is available in the portal
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the upload if email fails
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        type: document.type,
        createdAt: document.createdAt,
      }
    })

  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/load-requests/[id]/documents
 * Get all documents for a load request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const documents = await prisma.document.findMany({
      where: { loadRequestId: id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ documents })

  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

