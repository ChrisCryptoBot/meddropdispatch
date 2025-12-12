'use client'

import { useState, useEffect } from 'react'

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  document: {
    url: string
    title: string
    type?: string
  }
}

/**
 * Document Preview Modal
 * Displays PDFs and images in a modal without requiring download
 */
export default function DocumentPreviewModal({
  isOpen,
  onClose,
  document,
}: DocumentPreviewModalProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState<'pdf' | 'image' | 'unknown'>('unknown')

  useEffect(() => {
    if (!isOpen || !document.url) {
      setDocumentUrl(null)
      setIsLoading(true)
      setError(null)
      return
    }

    // Determine document type
    const url = document.url
    if (url.startsWith('data:')) {
      // Base64 data URL
      const mimeMatch = url.match(/data:([^;]+)/)
      const mimeType = mimeMatch ? mimeMatch[1] : ''
      
      if (mimeType.includes('pdf')) {
        setDocumentType('pdf')
      } else if (mimeType.includes('image')) {
        setDocumentType('image')
      } else {
        setDocumentType('unknown')
      }

      setDocumentUrl(url)
      setIsLoading(false)
    } else {
      // Regular URL
      if (url.toLowerCase().endsWith('.pdf') || url.includes('.pdf')) {
        setDocumentType('pdf')
      } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) {
        setDocumentType('image')
      } else {
        // Try to fetch and determine type
        fetch(url, { method: 'HEAD' })
          .then(res => {
            const contentType = res.headers.get('content-type') || ''
            if (contentType.includes('pdf')) {
              setDocumentType('pdf')
            } else if (contentType.includes('image')) {
              setDocumentType('image')
            } else {
              setDocumentType('unknown')
            }
            setDocumentUrl(url)
            setIsLoading(false)
          })
          .catch(() => {
            setDocumentType('unknown')
            setDocumentUrl(url)
            setIsLoading(false)
          })
      }
      
      setDocumentUrl(url)
      setIsLoading(false)
    }
  }, [isOpen, document.url])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass max-w-6xl w-full max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{document.title}</h3>
            {document.type && (
              <p className="text-xs text-gray-500 mt-1">{document.type.replace(/_/g, ' ')}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={document.url}
              download={document.title}
              className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-lg transition-all flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/60 rounded-lg transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading document...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium text-gray-700 mb-2">Unable to preview document</p>
                <p className="text-sm text-gray-500 mb-4">{error}</p>
                <a
                  href={document.url}
                  download={document.title}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Instead
                </a>
              </div>
            </div>
          ) : documentType === 'pdf' ? (
            <div className="w-full h-full min-h-[500px]">
              <iframe
                src={documentUrl || ''}
                className="w-full h-full min-h-[500px] border-0 rounded-lg"
                title={document.title}
              />
            </div>
          ) : documentType === 'image' ? (
            <div className="flex items-center justify-center">
              <img
                src={documentUrl || ''}
                alt={document.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                onError={() => setError('Failed to load image')}
                onLoad={() => setIsLoading(false)}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium text-gray-700 mb-2">Preview not available</p>
                <p className="text-sm text-gray-500 mb-4">This file type cannot be previewed in the browser</p>
                <a
                  href={document.url}
                  download={document.title}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download File
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

