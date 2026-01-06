/**
 * Vercel Blob Storage Utility
 * Handles document uploads to Vercel Blob Storage
 * 
 * Migration from Base64 database storage to blob storage
 * 
 * IMPORTANT: Before using, ensure BLOB_READ_WRITE_TOKEN is set in environment variables
 * Get token from: Vercel Dashboard → Project → Storage → Blob → Create Token
 */

import { put, head, del } from '@vercel/blob'

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.warn('⚠️  BLOB_READ_WRITE_TOKEN not configured. Document uploads will fall back to base64 storage.')
}

// Allowed file types for document uploads
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Validate file before upload
 */
function validateFile(file: File | Buffer, filename: string, contentType: string): void {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(contentType as any)) {
    throw new Error(`File type not allowed: ${contentType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`)
  }

  // Validate file size
  const fileSize = file instanceof Buffer ? file.length : (file as any).size || 0
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(fileSize / 1024 / 1024).toFixed(2)}MB. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  // Validate filename doesn't contain path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Invalid filename: path traversal detected')
  }

  // Validate filename extension matches content type
  const ext = filename.split('.').pop()?.toLowerCase()
  const expectedExts: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/jpg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  }

  const validExts = expectedExts[contentType] || []
  if (ext && !validExts.includes(ext)) {
    throw new Error(`File extension .${ext} doesn't match content type ${contentType}`)
  }
}

/**
 * Upload a document to Vercel Blob Storage
 * @param file - File object or Buffer containing file data
 * @param filename - Original filename (used for blob path)
 * @param contentType - MIME type (e.g., 'application/pdf', 'image/jpeg')
 * @returns Blob URL and metadata
 */
export async function uploadDocumentToBlob(
  file: File | Buffer,
  filename: string,
  contentType: string
): Promise<{ url: string; blobId: string }> {
  // Check if blob storage is configured
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured. Cannot upload to blob storage.')
  }

  // Validate file before upload
  validateFile(file, filename, contentType)

  try {
    // Generate unique filename with timestamp to avoid collisions
    const timestamp = Date.now()
    // Strict filename sanitization: only alphanumeric, dots, dashes, underscores
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100)
    const blobPath = `documents/${timestamp}-${sanitizedFilename}`

    // Upload to Vercel Blob
    const blob = await put(blobPath, file, {
      access: 'public',
      contentType,
      addRandomSuffix: true, // Add random suffix to prevent collisions
    })

    return {
      url: blob.url,
      blobId: blob.pathname, // Store pathname for potential deletion
    }
  } catch (error) {
    console.error('[Blob Storage] Failed to upload document:', error)
    throw new Error(`Failed to upload document to blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Check if a URL is a blob URL (for migration purposes)
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith('https://') && url.includes('blob.vercel-storage.com')
}

/**
 * Check if a URL is a base64 data URL (legacy format)
 */
export function isBase64DataUrl(url: string): boolean {
  return url.startsWith('data:')
}

/**
 * Delete a document from Vercel Blob Storage
 * @param blobUrl - The blob URL to delete
 */
export async function deleteDocumentFromBlob(blobUrl: string): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured. Cannot delete from blob storage.')
  }

  if (!isBlobUrl(blobUrl)) {
    console.warn('[Blob Storage] Attempted to delete non-blob URL:', blobUrl)
    return // Not a blob URL, nothing to delete
  }

  try {
    await del(blobUrl)
  } catch (error) {
    console.error('[Blob Storage] Failed to delete document:', error)
    // Don't throw - deletion failures shouldn't break the app
  }
}

/**
 * Get blob metadata (file size, content type, etc.)
 */
export async function getBlobMetadata(blobUrl: string): Promise<{
  size: number
  contentType: string
  uploadedAt: Date
} | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return null
  }

  if (!isBlobUrl(blobUrl)) {
    return null
  }

  try {
    const blob = await head(blobUrl)
    return {
      size: blob.size,
      contentType: blob.contentType,
      uploadedAt: blob.uploadedAt,
    }
  } catch (error) {
    console.error('[Blob Storage] Failed to get blob metadata:', error)
    return null
  }
}











