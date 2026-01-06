'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function QuickTrackWidget() {
  const router = useRouter()
  const [trackingCode, setTrackingCode] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (trackingCode.trim()) {
      router.push(`/track/${trackingCode.trim().toUpperCase()}`)
    }
  }

  return (
    <div className="max-w-3xl mx-auto mb-12">
      <div className="glass-primary rounded-3xl p-8 md:p-10 border-2 border-blue-200/30 shadow-glass hover:shadow-xl transition-all">
        <div className="text-center mb-8">
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Track Your Medical Shipment
          </h3>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Enter your tracking code to view real-time status, chain of custody, and delivery confirmation
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1 relative">
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Enter tracking code (e.g., MED-1234-AB)"
              className="w-full px-6 py-5 pl-16 rounded-xl border-2 border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none bg-white text-lg font-medium shadow-sm"
              required
            />
            <svg
              className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            type="submit"
            className="px-10 py-5 min-h-[44px] bg-gradient-primary text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all shadow-lg transform hover:scale-105 whitespace-nowrap"
          >
            Track Now
          </button>
        </form>
      </div>
    </div>
  )
}

