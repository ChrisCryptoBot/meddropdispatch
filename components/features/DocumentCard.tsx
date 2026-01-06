'use client'

import { useState } from 'react'
import DocumentPreviewModal from './DocumentPreviewModal'
import { formatDate } from '@/lib/utils'

interface DocumentCardProps {
  document: {
    id: string
    title: string
    url: string
    type?: string
    createdAt: string | Date
  }
  className?: string
}

export default function DocumentCard({ document, className = "" }: DocumentCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </div>
      <DocumentPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        document={{
          url: document.url,
          title: document.title,
          type: document.type,
        }}
      />
    </>
  )
}


