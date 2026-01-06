'use client'

import { useState, useRef, useEffect } from 'react'
import { showToast } from '@/lib/toast'

interface ImageUploadWithCropProps {
  currentImage?: string | null
  onImageChange: (base64Image: string) => void
  aspectRatio?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  circular?: boolean
}

export default function ImageUploadWithCrop({
  currentImage,
  onImageChange,
  aspectRatio = 1,
  minWidth = 200,
  minHeight = 200,
  maxWidth = 800,
  maxHeight = 800,
  circular = true,
}: ImageUploadWithCropProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(currentImage || null)
  const [isCropping, setIsCropping] = useState(false)
  const [cropData, setCropData] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (currentImage) {
      setImageSrc(currentImage)
    }
  }, [currentImage])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast.error('Invalid file type', 'Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast.error('File too large', 'Please select an image smaller than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setImageSrc(result)
      setIsCropping(true)
      // Initialize crop to cover full image
      const img = new Image()
      img.onload = () => {
        const size = Math.min(img.width, img.height)
        setCropData({
          x: (img.width - size) / 2,
          y: (img.height - size) / 2,
          width: size,
          height: size,
        })
        setScale(1)
        setPosition({ x: 0, y: 0 })
      }
      img.src = result
    }
    reader.readAsDataURL(file)
  }

  const handleCrop = () => {
    if (!imageSrc || !imageRef.current) return

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Calculate actual crop coordinates
      const imgRect = imageRef.current!.getBoundingClientRect()
      const containerRect = containerRef.current!.getBoundingClientRect()
      
      const scaleX = img.width / imgRect.width
      const scaleY = img.height / imgRect.height
      
      const cropX = (cropData.x - position.x) * scaleX
      const cropY = (cropData.y - position.y) * scaleY
      const cropWidth = cropData.width * scaleX * scale
      const cropHeight = cropData.height * scaleY * scale

      // Set canvas size
      const outputSize = circular ? Math.min(cropWidth, cropHeight) : Math.max(cropWidth, cropHeight)
      canvas.width = outputSize
      canvas.height = outputSize

      // Draw cropped image
      if (circular) {
        ctx.beginPath()
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI)
        ctx.clip()
      }
      
      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        outputSize,
        outputSize
      )

      // Convert to base64
      const base64 = canvas.toDataURL('image/jpeg', 0.9)
      onImageChange(base64)
      setImageSrc(base64)
      setIsCropping(false)
      showToast.success('Image cropped and saved!')
    }
    img.src = imageSrc
  }

  const handleCancelCrop = () => {
    setIsCropping(false)
    if (currentImage) {
      setImageSrc(currentImage)
    } else {
      setImageSrc(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCropping) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isCropping) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {imageSrc && !isCropping && (
          <div className={`${circular ? 'rounded-full' : 'rounded-lg'} overflow-hidden border-4 border-teal-200 shadow-lg`} style={{ width: '120px', height: '120px' }}>
            <img
              src={imageSrc}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {isCropping && imageSrc && (
          <div
            ref={containerRef}
            className="relative border-4 border-teal-500 rounded-lg overflow-hidden bg-gray-100"
            style={{ width: '300px', height: '300px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              className="absolute w-full h-full object-contain"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
            />
            <div
              className="absolute border-2 border-teal-500 bg-teal-500/20 pointer-events-none"
              style={{
                left: `${cropData.x}px`,
                top: `${cropData.y}px`,
                width: `${cropData.width}px`,
                height: `${cropData.height}px`,
                borderRadius: circular ? '50%' : '0',
              }}
            />
          </div>
        )}

        <div className="flex-1">
          {!isCropping && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-medical flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {imageSrc ? 'Change Photo' : 'Upload Photo'}
              </button>
              {imageSrc && (
                <button
                  type="button"
                  onClick={() => {
                    setImageSrc(null)
                    onImageChange('')
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="mt-2 px-4 py-2 text-urgent-600 hover:bg-urgent-50 rounded-lg font-medium transition-colors"
                >
                  Remove Photo
                </button>
              )}
            </>
          )}

          {isCropping && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Zoom: {Math.round(scale * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCrop}
                  className="px-4 py-2 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-medical"
                >
                  Save Crop
                </button>
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Drag the image to reposition, use the slider to zoom
              </p>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

