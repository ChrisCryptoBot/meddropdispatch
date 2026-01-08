'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DriverSupportPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get driver from API auth check (httpOnly cookie) - layout handles redirects
    const fetchDriverData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'driver') {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[100px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Support
        </h1>
        <p className="text-slate-400">Get help and contact our support team</p>
      </div>

      {isLoading ? (
        <div className="glass-primary p-12 rounded-2xl text-center border border-slate-700/50 shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-primary p-6 rounded-2xl border border-slate-700/50 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Contact Support</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300">Email</label>
                <a href="mailto:meddrop.dispatch@outlook.com" className="text-lg text-cyan-400 hover:text-cyan-300 font-semibold block transition-colors">
                  meddrop.dispatch@outlook.com
                </a>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">Phone</label>
                <a href="tel:+19039140386" className="text-lg text-cyan-400 hover:text-cyan-300 font-semibold block transition-colors">
                  (903) 914-0386
                </a>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300">Hours</label>
                <p className="text-lg text-white font-semibold">24/7 Support Available</p>
              </div>
            </div>
          </div>

          <div className="glass-primary p-6 rounded-2xl border border-slate-700/50 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Help Resources</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white mb-2">Getting Started Guide</h3>
                <p className="text-sm text-slate-300">Learn how to use the driver portal and manage your loads</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">FAQs</h3>
                <p className="text-sm text-slate-300">Common questions and answers about the platform</p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Documentation</h3>
                <p className="text-sm text-slate-300">Complete documentation and training materials</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

