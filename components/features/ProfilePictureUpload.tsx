'use client'

import { useState, useRef, useEffect } from 'react'
import { showToast } from '@/lib/toast'

interface ProfilePictureUploadProps {
  currentImage?: string | null
  onImageChange: (base64Image: string) => void
  size?: number
}

export default function ProfilePictureUpload({
  currentImage,
  onImageChange,
  size = 200,
}: ProfilePictureUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMounted(true)
    if (currentImage) {
      setPreview(currentImage)
    }
  }, [currentImage])

  const processImage = (file: File) => {
    // Ensure we're in the browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      showToast.error('Image processing is only available in the browser')
      return
    }

    setIsProcessing(true)
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Create canvas for resizing and cropping
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setIsProcessing(false)
          showToast.error('Failed to process image')
          return
        }

        // Calculate crop to make it square (center crop)
        const minDimension = Math.min(img.width, img.height)
        const startX = (img.width - minDimension) / 2
        const startY = (img.height - minDimension) / 2

        // Set canvas size
        canvas.width = size
        canvas.height = size

        // Draw circular image
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI)
        ctx.clip()

        // Draw and resize image
        ctx.drawImage(
          img,
          startX,
          startY,
          minDimension,
          minDimension,
          0,
          0,
          size,
          size
        )

        // Convert to base64
        const base64 = canvas.toDataURL('image/jpeg', 0.85)
        setPreview(base64)
        onImageChange(base64)
        setIsProcessing(false)
        showToast.success('Profile picture updated!')
      }
      img.onerror = () => {
        showToast.error('Error processing image')
        setIsProcessing(false)
      }
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      showToast.error('Error reading file')
      setIsProcessing(false)
    }
    
    reader.readAsDataURL(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast.error('Invalid file type', 'Please select an image file (JPG, PNG, etc.)')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast.error('File too large', 'Please select an image smaller than 5MB')
      return
    }

    processImage(file)
  }

  const handleRemove = () => {
    setPreview(null)
    onImageChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    showToast.success('Profile picture removed')
  }

  // Don't render until mounted (prevents SSR issues)
  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100 flex items-center justify-center shadow-lg" style={{ width: `${size}px`, height: `${size}px` }}>
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        {preview ? (
          <div className="relative">
            <div className="relative rounded-full overflow-hidden border-4 border-teal-200 shadow-lg flex-shrink-0" style={{ width: `${size}px`, height: `${size}px` }}>
              <img
                src={preview}
                alt="Profile"
                className="absolute inset-0 w-full h-full object-cover object-center"
                style={{ 
                  objectFit: 'cover', 
                  objectPosition: 'center',
                  width: '100%',
                  height: '100%',
                  minWidth: '100%',
                  minHeight: '100%'
                }}
              />
            </div>
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100 flex items-center justify-center shadow-lg" style={{ width: `${size}px`, height: `${size}px` }}>
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}

        <div className="flex-1 space-y-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-medical flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {preview ? 'Change Photo' : 'Upload Photo'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isProcessing}
              className="px-4 py-2 text-urgent-600 hover:bg-urgent-50 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Remove Photo
            </button>
          )}
          <p className="text-xs text-gray-500">
            Recommended: Square image, at least {size}x{size}px. Max 5MB.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

