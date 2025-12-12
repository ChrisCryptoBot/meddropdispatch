'use client'

import { useState } from 'react'
import DocumentPreviewModal from './DocumentPreviewModal'

interface DocumentViewButtonProps {
  url: string
  title?: string
  type?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Button component for viewing documents
 * Opens documents in a preview modal instead of new window
 */
export default function DocumentViewButton({ 
  url, 
  title,
  type,
  className = "px-3 py-2 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer",
  children = "View"
}: DocumentViewButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={className}
        title={title || 'View document'}
      >
        {children}
      </button>
      <DocumentPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        document={{
          url,
          title: title || 'Document',
          type,
        }}
      />
    </>
  )
}


