'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const trackingCode = searchParams.get('trackingCode')

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="glass p-12 rounded-3xl text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Request Submitted!
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            We've received your load request and will review it shortly. You'll receive a quote via your preferred contact method.
          </p>

          {trackingCode && (
            <>
              <div className="glass p-6 rounded-xl mb-8 border border-primary-200">
                <p className="text-sm text-gray-600 mb-2">Your Tracking Code:</p>
                <p className="text-3xl font-bold text-primary-700 tracking-wider">
                  {trackingCode}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Save this code to track your shipment
                </p>
              </div>

              <Link
                href={`/track/${trackingCode}`}
                className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 transition-base shadow-lg hover:shadow-xl mb-4"
              >
                Track Your Shipment
              </Link>
            </>
          )}

          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link
              href="/"
              className="text-primary-600 hover:text-primary-700 font-medium transition-base"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
