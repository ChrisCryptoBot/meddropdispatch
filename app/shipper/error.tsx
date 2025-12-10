'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ShipperError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Shipper error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-neutral-50 to-stone-50">
      <div className="max-w-2xl w-full text-center">
        <div className="glass p-12 rounded-3xl">
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">Shipper Portal Error</h1>
          <p className="text-lg text-gray-600 mb-8">
            {error.message || 'An unexpected error occurred in the shipper portal.'}
          </p>

          {error.digest && (
            <p className="text-sm text-gray-500 mb-8 font-mono">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold hover:from-slate-700 hover:to-slate-800 transition-all"
            >
              Try Again
            </button>
            <Link
              href="/shipper/dashboard"
              className="px-6 py-3 rounded-xl glass text-slate-700 font-semibold hover:bg-white/60 transition-all"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-all"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

