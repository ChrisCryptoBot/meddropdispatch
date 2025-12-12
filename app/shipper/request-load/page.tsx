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
      <div className="glass p-8 rounded-2xl text-center max-w-2xl w-full">
        <div className="w-16 h-16 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Call to Book Your Load</h1>
        <p className="text-lg text-gray-700 mb-6">
          To schedule a medical courier service, please call us directly. Our team will help you create your load request and get it scheduled quickly.
        </p>
        
        {/* Call to Action */}
        <div className="glass rounded-2xl p-6 mb-6 bg-gradient-to-r from-slate-50 to-neutral-50 border-2 border-slate-300">
          <p className="text-sm text-gray-600 mb-4">Call us now to book your load:</p>
          <a
            href="tel:+1234567890"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-bold text-xl hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg mb-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            (123) 456-7890
          </a>
          <p className="text-xs text-gray-500">Available 24/7 for urgent medical courier needs</p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-600 mb-4">
            After calling, you'll receive email notifications when your load is created and can track it from your dashboard.
          </p>
          <Link
            href="/shipper/dashboard"
            className="inline-block px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
