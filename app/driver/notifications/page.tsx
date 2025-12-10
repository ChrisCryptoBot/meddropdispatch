'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DriverNotificationsPage() {
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
    <div className="p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Notifications</h1>

      {isLoading ? (
        <div className="glass p-12 rounded-2xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      ) : (
        <div className="glass p-12 rounded-2xl text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-lg font-medium text-gray-700 mb-2">No notifications yet</p>
          <p className="text-sm text-gray-500">Updates about new loads and assignments will appear here</p>
        </div>
      )}
    </div>
  )
}

