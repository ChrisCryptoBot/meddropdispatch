'use client'

// Admin Dashboard
// Comprehensive dashboard with quote requests, stats, and quick actions

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QuoteRequestCard from '@/components/features/QuoteRequestCard'

interface ComplianceReminder {
  id: string
  type: string
  title: string
  description: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  daysUntilExpiry: number
}

interface DashboardStats {
  todayLoads: number
  todayLoadsChange: number
  activeLoads: number
  pendingQuotes: number
  completedToday: number
  completedChange: number
  revenueToday: number
  revenueChange: number
  recentQuoteRequests: any[]
}

interface QuoteRequest {
  id: string
  publicTrackingCode: string
  shipper: {
    id: string
    companyName: string
    email: string
    phone: string
  }
  pickupFacility: {
    city: string
    state: string
  }
  dropoffFacility: {
    city: string
    state: string
  }
  serviceType: string
  autoCalculatedDistance?: number
  suggestedRateMin?: number
  suggestedRateMax?: number
  createdAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if admin is logged in
    const admin = localStorage.getItem('admin')
    if (!admin) {
      router.push('/admin/login')
      return
    }

    // Fetch dashboard data
    fetchDashboardData()
  }, [router])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      // Fetch stats
      const statsResponse = await fetch('/api/admin/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch quote requests
      const quoteResponse = await fetch('/api/load-requests/quote-requests?limit=5')
      if (quoteResponse.ok) {
        const quoteData = await quoteResponse.json()
        setQuoteRequests(quoteData.quoteRequests || [])
      }

      // Fetch compliance reminders
      const complianceResponse = await fetch('/api/compliance/reminders')
      if (complianceResponse.ok) {
        const complianceData = await complianceResponse.json()
        setComplianceReminders(complianceData.reminders || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCalculateRate = async (requestId: string) => {
    try {
      const response = await fetch(`/api/load-requests/${requestId}/calculate-rate`, {
        method: 'POST',
      })
      if (response.ok) {
        // Refresh quote requests
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error calculating rate:', error)
    }
  }

  const handleConvertToLoad = async (requestId: string) => {
    try {
      const response = await fetch(`/api/load-requests/${requestId}/convert-to-load`, {
        method: 'POST',
      })
      if (response.ok) {
        // Refresh dashboard
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error converting to load:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Overview of operations and pending quote requests</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Today's Loads */}
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Today's Loads</p>
                <p className="text-3xl font-bold text-primary-700">{stats.todayLoads}</p>
                {stats.todayLoadsChange !== 0 && (
                  <p className={`text-xs mt-1 ${stats.todayLoadsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.todayLoadsChange > 0 ? '↑' : '↓'} {Math.abs(stats.todayLoadsChange)}% vs yesterday
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Loads */}
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Loads</p>
                <p className="text-3xl font-bold text-cyan-700">{stats.activeLoads}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Quotes */}
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Quotes</p>
                <p className="text-3xl font-bold text-amber-700">{stats.pendingQuotes}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Completed Today */}
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed Today</p>
                <p className="text-3xl font-bold text-emerald-700">{stats.completedToday}</p>
                {stats.completedChange !== 0 && (
                  <p className={`text-xs mt-1 ${stats.completedChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.completedChange > 0 ? '↑' : '↓'} {Math.abs(stats.completedChange)}% vs yesterday
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quote Requests Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Recent Quote Requests</h2>
            <p className="text-gray-600 mt-1">New quote requests requiring attention</p>
          </div>
          <Link
            href="/admin/loads?status=QUOTE_REQUESTED"
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            View All
          </Link>
        </div>

        {quoteRequests.length === 0 ? (
          <div className="glass p-12 rounded-2xl text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 text-lg">No pending quote requests</p>
            <p className="text-gray-500 text-sm mt-2">New quote requests will appear here</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {quoteRequests.map((request) => (
              <QuoteRequestCard
                key={request.id}
                request={request}
                onCalculateRate={handleCalculateRate}
                onConvertToLoad={handleConvertToLoad}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="glass p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/admin/loads?status=QUOTE_REQUESTED"
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Review Quotes</p>
                <p className="text-sm text-gray-500">View all quote requests</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/loads"
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">All Loads</p>
                <p className="text-sm text-gray-500">Manage all load requests</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/shippers"
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Shippers</p>
                <p className="text-sm text-gray-500">Manage shipper accounts</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
