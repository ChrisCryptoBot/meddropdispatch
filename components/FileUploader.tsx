'use client'

import { useState, useRef, DragEvent } from 'react'

interface FileUploaderProps {
  onUploadComplete: (url: string, file: File) => void
  onUploadError: (error: string) => void
  accept?: string
  maxSize?: number // in bytes
  label?: string
  className?: string
}

export default function FileUploader({
  onUploadComplete,
  onUploadError,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 10 * 1024 * 1024, // 10MB default
  label = 'Upload File',
  className = '',
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFile = async (file: File) => {
    // Validate file size
    if (file.size > maxSize) {
      onUploadError(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`)
      return
    }

    // Validate file type
    const validExtensions = accept.split(',').map(ext => ext.trim().replace('.', ''))
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isValidType = validExtensions.some(ext => 
      file.type.includes(ext) || fileExtension === ext
    )

    if (!isValidType) {
      onUploadError(`File type not supported. Please upload: ${accept}`)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('file', file)

      // Upload to Vercel Blob
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Upload failed')
      }

      const data = await response.json()
      setUploadProgress(100)
      
      // Call completion callback
      onUploadComplete(data.url, file)
      
      // Reset after short delay
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 500)
    } catch (error) {
      console.error('Upload error:', error)
      onUploadError(error instanceof Error ? error.message : 'Upload failed')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 transition-all
          ${isDragging 
            ? 'border-teal-500 bg-teal-50/60' 
            : 'border-teal-200/30 bg-white/60 hover:border-teal-300 hover:bg-teal-50/40'
          }
          ${isUploading ? 'pointer-events-none opacity-75' : 'cursor-pointer'}
        `}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-gray-600">Uploading... {uploadProgress}%</p>
            {uploadProgress > 0 && (
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="w-12 h-12 text-teal-500 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-gray-700 font-medium mb-1">
              {isDragging ? 'Drop file here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500">
              {accept} (max {(maxSize / 1024 / 1024).toFixed(0)}MB)
            </p>
          </div>
        )}
      </div>
    </div>
  )
}





