'use client'

import DocumentViewButton from './DocumentViewButton'
import { formatDate } from '@/lib/utils'

interface DocumentCardProps {
  document: {
    id: string
    title: string
    url: string
    createdAt: string | Date
  }
  className?: string
}

export default function DocumentCard({ document, className = "" }: DocumentCardProps) {
  return (
    <div
      onClick={() => {
        if (document.url.startsWith('data:')) {
          try {
            const [mimeType, base64Data] = document.url.split(',')
            const mimeMatch = mimeType.match(/data:([^;]+)/)
            const actualMimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
            
            const binaryString = atob(base64Data)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            
            const blob = new Blob([bytes], { type: actualMimeType })
            const blobUrl = URL.createObjectURL(blob)
            window.open(blobUrl, '_blank')
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
          } catch (error) {
            console.error('Error opening document:', error)
            alert('Unable to open document.')
          }
        } else {
          window.open(document.url, '_blank')
        }
      }}
      className={`flex items-center gap-4 p-4 rounded-xl bg-white/60 hover:bg-white/80 border border-gray-200 hover:border-primary-300 transition-base group cursor-pointer ${className}`}
    >
      <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 group-hover:text-primary-700 transition-base truncate">
          {document.title}
        </p>
        <p className="text-xs text-gray-500">{formatDate(document.createdAt)}</p>
      </div>
      <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-base flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </div>
  )
}


