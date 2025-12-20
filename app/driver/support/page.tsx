'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DriverSupportPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    setIsLoading(false)
  }, [router])

  return (
    <div className="p-8 print:p-4">
      <div className="sticky top-0 z-30 bg-gradient-medical-bg backdrop-blur-sm pt-[73px] pb-4 mb-8 print:mb-4 print:static print:pt-8 print:top-0 border-b border-teal-200/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">Support</h1>
            <p className="text-gray-600 print:text-sm">Get help and contact our support team</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="glass p-12 rounded-2xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Support</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <a href="mailto:meddrop.dispatch@outlook.com" className="text-lg text-accent-600 hover:text-accent-700 font-semibold block">
                  meddrop.dispatch@outlook.com
                </a>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <a href="tel:+19039140386" className="text-lg text-accent-600 hover:text-accent-700 font-semibold block">
                  (903) 914-0386
                </a>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Hours</label>
                <p className="text-lg text-gray-900">24/7 Support Available</p>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Help Resources</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Getting Started Guide</h3>
                <p className="text-sm text-gray-600">Learn how to use the driver portal and manage your loads</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">FAQs</h3>
                <p className="text-sm text-gray-600">Common questions and answers about the platform</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Documentation</h3>
                <p className="text-sm text-gray-600">Complete documentation and training materials</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

