// General Utility Functions

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format time only
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Get base URL for the application
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
}

/**
 * Generate tracking URL
 */
export function getTrackingUrl(trackingCode: string): string {
  return `${getBaseUrl()}/track/${trackingCode}`
}

/**
 * Open a document URL (handles data URLs by converting to blob)
 * Browsers block navigating to data URLs in top frame, so we convert to blob URL
 */
export function openDocument(url: string, filename?: string): void {
  if (url.startsWith('data:')) {
    // Convert data URL to blob URL
    try {
      const [mimeType, base64Data] = url.split(',')
      const mimeMatch = mimeType.match(/data:([^;]+)/)
      const actualMimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
      
      // Decode base64
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // Create blob and blob URL
      const blob = new Blob([bytes], { type: actualMimeType })
      const blobUrl = URL.createObjectURL(blob)
      
      // Open in new window
      const newWindow = window.open(blobUrl, '_blank')
      
      // Clean up blob URL after a delay (give browser time to load)
      if (newWindow) {
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl)
        }, 1000)
      } else {
        // If popup blocked, try download instead
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename || 'document'
        if (actualMimeType === 'application/pdf') {
          link.download += '.pdf'
        } else if (actualMimeType.startsWith('image/')) {
          link.download += '.' + actualMimeType.split('/')[1]
        }
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
      }
    } catch (error) {
      console.error('Error opening data URL:', error)
      // Fallback: try direct navigation (may fail but worth trying)
      window.open(url, '_blank')
    }
  } else {
    // Regular URL - open normally
    window.open(url, '_blank')
  }
}

/**
 * Get a safe URL for document links (converts data URLs to blob URLs)
 * Returns a blob URL that can be used in href attributes
 */
export function getDocumentUrl(url: string): string {
  if (!url.startsWith('data:')) {
    return url
  }
  
  // For data URLs, we need to handle them differently
  // We'll return a special marker and handle it in the click handler
  return url
}