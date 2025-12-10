'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ShipperTrackingPage() {
  const router = useRouter()
  const [trackingCode, setTrackingCode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (trackingCode.trim()) {
      router.push(`/track/${trackingCode.trim().toUpperCase()}`)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Track Shipment</h1>
          <p className="text-lg text-gray-600">
            Enter your tracking code to view real-time status updates
          </p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="trackingCode" className="block text-sm font-semibold text-gray-700 mb-2">
                Tracking Code
              </label>
              <input
                type="text"
                id="trackingCode"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="MED-XXXX-YY"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-lg font-mono"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold text-lg hover:from-primary-700 hover:to-primary-800 transition-base shadow-lg"
            >
              Track Shipment
            </button>
          </form>
        </div>

        <div className="mt-8 glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Links</h3>
          <div className="space-y-2">
            <Link
              href="/shipper/dashboard"
              className="block text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Back to My Loads
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

