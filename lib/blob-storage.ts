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

  try {
    // Generate unique filename with timestamp to avoid collisions
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
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






