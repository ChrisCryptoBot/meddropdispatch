'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
      <header className="glass-primary sticky top-0 z-50 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-600 bg-clip-text text-transparent">MED DROP</h1>
                <p className="text-xs text-slate-400">Medical Courier Services</p>
              </div>
            </Link>
            <Link
              href="/request-load"
              className="text-slate-300 hover:text-cyan-400 transition-colors font-medium"
            >
              Request a Load
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="glass-primary p-12 rounded-xl text-center border border-slate-700/50 shadow-lg">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <h2 className="text-4xl font-bold text-white mb-4 font-heading">
            Track Your Shipment
          </h2>

          <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
            Enter your tracking code to view delivery status and tracking events.
          </p>

          <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
            <div className="space-y-4">
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
                  className="w-full px-6 py-4 rounded-xl border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 text-lg font-mono"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[44px] px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-bold text-lg hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
              >
                Track Shipment
              </button>
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-700/50">
            <p className="text-sm text-slate-500 mb-4">
              Your tracking code was provided when you submitted your request.
            </p>
            <p className="text-sm text-slate-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@meddrop.com" className="text-cyan-400 hover:text-cyan-300 font-medium">
                support@meddrop.com
              </a>
            </p>
          </div>
        </div>

        {/* Tracking Code Format Info */}
        <div className="mt-12 glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
          <h3 className="text-xl font-bold text-white mb-4">Tracking Code Format</h3>
          <p className="text-slate-400">
            Your tracking code follows this format: <span className="font-mono font-bold text-cyan-400 font-data">MED-XXXX-YY</span>
          </p>
        </div>
      </main>
    </div>
  )
}
