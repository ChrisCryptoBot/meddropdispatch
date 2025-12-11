'use client'

// Camera Capture Component
// Captures photos using device camera for documentation

import React, { useRef, useState } from 'react'

interface CameraCaptureProps {
  onCapture: (file: File) => void
  onCancel: () => void
  label?: string
}

export default function CameraCapture({ onCapture, onCancel, label = 'Take Photo' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setError(null)
    } catch (err: any) {
      console.error('Error accessing camera:', err)
      setError(err.message || 'Failed to access camera')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
        stopCamera()
      }
    }, 'image/jpeg', 0.9)
  }

  // Start camera on mount
  React.useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera View */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="bg-black/80 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-100 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={capturePhoto}
            disabled={!stream || isCapturing}
            className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 shadow-lg disabled:opacity-50"
          >
            <span className="sr-only">Capture</span>
          </button>
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Retake
          </button>
        </div>
      </div>
    </div>
  )
}


