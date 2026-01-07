'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SupportPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)

  useEffect(() => {
    // Get shipper from API auth check (httpOnly cookie) - layout handles redirects
    const fetchShipperData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'shipper') {
          return // Layout will handle redirect
        }
        
        setShipper(data.user)
      } catch (error) {
        console.error('Error fetching shipper data:', error)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchShipperData()
  }, [])

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight print:text-2xl">Support & Help</h1>
        <p className="text-slate-400 text-sm md:text-base print:text-sm">Get assistance with your shipments and account</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="glass-primary rounded-2xl p-6 border border-slate-700/50 shadow-lg">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Email Support</h3>
          <p className="text-slate-300 mb-4">Send us an email and we'll get back to you within 24 hours</p>
          <a
            href="mailto:meddrop.dispatch@outlook.com"
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline hover:no-underline transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            meddrop.dispatch@outlook.com
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="glass-primary rounded-2xl p-6 border border-slate-700/50 shadow-lg">
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Phone Support</h3>
          <p className="text-slate-300 mb-4">Available 24/7 for urgent medical courier needs</p>
          <a
            href="tel:+19039140386"
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline hover:no-underline transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            (903) 914-0386
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="glass-primary rounded-2xl p-6 border border-slate-700/50 shadow-lg">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">FAQ</h3>
          <p className="text-slate-300 mb-4">Find answers to commonly asked questions</p>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              alert('FAQ page coming soon!')
            }}
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline hover:no-underline transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            View FAQ
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="glass-primary rounded-2xl p-6 border border-slate-700/50 shadow-lg">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Documentation</h3>
          <p className="text-slate-300 mb-4">Learn how to use the shipper portal</p>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              alert('Documentation page coming soon!')
            }}
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline hover:no-underline transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            View Docs
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      <div className="glass-primary rounded-2xl p-6 border border-slate-700/50 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Need Immediate Help?</h2>
        <p className="text-slate-300 mb-4">
          For urgent shipment issues, please call our emergency line: <strong className="text-white">(903) 914-0386</strong>
        </p>
        <p className="text-sm text-slate-400">
          Available 24/7 for time-sensitive medical courier requests
        </p>
      </div>
    </div>
  )
}


