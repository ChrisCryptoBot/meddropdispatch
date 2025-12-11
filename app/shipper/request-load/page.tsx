'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ShipperRequestLoadPage() {
  const router = useRouter()

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="glass p-8 rounded-2xl text-center max-w-2xl">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Load Creation Moved to Drivers</h1>
        <p className="text-lg text-gray-700 mb-6">
          Drivers now create load requests on your behalf. You will receive notifications when new loads are created and can accept or reject them from your dashboard.
        </p>
        <Link
          href="/shipper/dashboard"
          className="inline-block px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
