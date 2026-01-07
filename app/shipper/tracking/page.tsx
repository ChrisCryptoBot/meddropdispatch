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
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight print:text-2xl">Track Shipment</h1>
        <p className="text-slate-400 text-sm md:text-base print:text-sm">Enter your tracking code to view delivery status and tracking events</p>
      </div>
      <div className="max-w-2xl mx-auto">

        <div className="glass-primary rounded-xl p-8 border border-slate-700/50 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="trackingCode" className="block text-sm font-semibold text-slate-300 mb-2">
                Tracking Code
              </label>
              <input
                type="text"
                id="trackingCode"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="123456789"
                className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 text-lg font-mono font-data"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-bold text-lg hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
            >
              Track Shipment
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

