'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function TrackPage() {
  const router = useRouter()
  const [trackingCode, setTrackingCode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (trackingCode.trim()) {
      router.push(`/track/${trackingCode.trim().toUpperCase()}`)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <Image
                  src="/logo-icon.png"
                  alt="MED DROP Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">MED DROP</h1>
                <p className="text-xs text-gray-600">Medical Courier Services</p>
              </div>
            </Link>
            <Link
              href="/request-load"
              className="text-gray-700 hover:text-primary-600 transition-base font-medium"
            >
              Request a Load
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass p-12 rounded-3xl text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Track Your Shipment
          </h2>

          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Enter your tracking code to view delivery status and tracking events.
          </p>

          <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="Enter tracking code (e.g., MED-1234-AB)"
                className="flex-1 px-6 py-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-lg"
                required
              />
              <button
                type="submit"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 transition-base shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                Track
              </button>
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">
              Your tracking code was provided when you submitted your request.
            </p>
            <p className="text-sm text-gray-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@meddrop.com" className="text-primary-600 hover:text-primary-700 font-medium">
                support@meddrop.com
              </a>
            </p>
          </div>
        </div>

        {/* Tracking Code Format Info */}
        <div className="mt-12 glass p-8 rounded-2xl">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Tracking Code Format</h3>
          <p className="text-gray-600">
            Your tracking code follows this format: <span className="font-mono font-bold text-primary-700">MED-XXXX-YY</span>
          </p>
        </div>
      </main>
    </div>
  )
}
