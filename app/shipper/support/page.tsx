'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SupportPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    setShipper(JSON.parse(shipperData))
  }, [router])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Support & Help</h1>
        <p className="text-gray-600">Get assistance with your shipments and account</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="glass rounded-2xl p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Email Support</h3>
          <p className="text-gray-600 mb-4">Send us an email and we'll get back to you within 24 hours</p>
          <a
            href="mailto:support@meddrop.com"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            support@meddrop.com →
          </a>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Phone Support</h3>
          <p className="text-gray-600 mb-4">Call us Monday-Friday, 8AM-6PM EST</p>
          <a
            href="tel:+1234567890"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            (123) 456-7890 →
          </a>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">FAQ</h3>
          <p className="text-gray-600 mb-4">Find answers to commonly asked questions</p>
          <Link
            href="/shipper/support/faq"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            View FAQ →
          </Link>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Documentation</h3>
          <p className="text-gray-600 mb-4">Learn how to use the shipper portal</p>
          <Link
            href="/shipper/support/docs"
            className="text-primary-600 hover:text-primary-700 font-semibold"
          >
            View Docs →
          </Link>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Need Immediate Help?</h2>
        <p className="text-gray-600 mb-4">
          For urgent shipment issues, please call our emergency line: <strong>(123) 456-7890</strong>
        </p>
        <p className="text-sm text-gray-500">
          Available 24/7 for time-sensitive medical courier requests
        </p>
      </div>
    </div>
  )
}

