'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
    <div className="p-8 print:p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 print:text-2xl">Track Shipment</h1>
            <p className="text-slate-400 text-sm md:text-base print:text-sm">Enter your tracking code to view delivery status and tracking events</p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto">

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
              className="w-full min-h-[44px] px-6 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold text-lg hover:from-primary-700 hover:to-primary-800 transition-base shadow-lg"
            >
              Track Shipment
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

