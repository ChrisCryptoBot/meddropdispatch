'use client'

// Admin Dashboard
// Comprehensive dashboard with quote requests, stats, and quick actions

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { EmptyStates } from '@/components/ui/EmptyState'

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
  trackingCode: string
  shipper: {
    id: string
    companyName: string
    email: string
    phone: string
  }
  route: string
  distance?: number
  suggestedRate?: {
    min: number
    max: number
  }
  createdAt: string
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch dashboard data
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)

      // Fetch stats
      const statsResponse = await fetch('/api/admin/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
        setQuoteRequests(statsData.recentQuoteRequests || [])
        
        // If no quote requests in stats, fetch separately
        if (!statsData.recentQuoteRequests || statsData.recentQuoteRequests.length === 0) {
          const quoteResponse = await fetch('/api/load-requests/quote-requests?limit=5')
          if (quoteResponse.ok) {
            const quoteData = await quoteResponse.json()
            setQuoteRequests(quoteData.quoteRequests || [])
          }
        }
      } else {
        console.error('Failed to fetch stats:', statsResponse.status, statsResponse.statusText)
        // Fallback: fetch quote requests separately
        const quoteResponse = await fetch('/api/load-requests/quote-requests?limit=5')
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json()
          setQuoteRequests(quoteData.quoteRequests || [])
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-0 z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-slate-400">Overview of operations and pending quote requests</p>
      </div>

      {/* Stats Cards - Gold Standard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {/* Today's Loads */}
          <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1 font-data">{stats.todayLoads}</p>
              <p className="text-sm text-slate-400 font-medium">Today's Loads</p>
              {stats.todayLoadsChange !== 0 && (
                <p className={`text-xs mt-1 ${stats.todayLoadsChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.todayLoadsChange > 0 ? '↑' : '↓'} {Math.abs(stats.todayLoadsChange)}% vs yesterday
                </p>
              )}
            </div>
          </div>

          {/* Active Loads */}
          <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1 font-data">{stats.activeLoads}</p>
              <p className="text-sm text-slate-400 font-medium">Active Loads</p>
            </div>
          </div>

          {/* Pending Quotes */}
          <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-amber-500/50 transition-all">
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1 font-data">{stats.pendingQuotes}</p>
              <p className="text-sm text-slate-400 font-medium">Pending Quotes</p>
            </div>
          </div>

          {/* Completed Today */}
          <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-green-500/50 transition-all">
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1 font-data">{stats.completedToday}</p>
              <p className="text-sm text-slate-400 font-medium">Completed Today</p>
              {stats.completedChange !== 0 && (
                <p className={`text-xs mt-1 ${stats.completedChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.completedChange > 0 ? '↑' : '↓'} {Math.abs(stats.completedChange)}% vs yesterday
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quote Requests Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Recent Quote Requests</h2>
            <p className="text-slate-400">New quote requests requiring attention</p>
          </div>
          <Link
            href="/admin/loads?status=QUOTE_REQUESTED"
            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:shadow-xl hover:shadow-cyan-500/50 transition-all"
          >
            View All
          </Link>
        </div>

        {quoteRequests.length === 0 ? (
          <EmptyStates.NoLoads
            title="No Pending Quote Requests"
            description="New quote requests will appear here when shippers submit them."
            action={{
              label: "View All Loads",
              href: "/admin/loads"
            }}
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {quoteRequests.map((request) => (
              <div
                key={request.id}
                className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {request.shipper.companyName}
                    </h3>
                    <p className="text-sm text-slate-400">{request.route}</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                    Quote Requested
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  {request.distance && (
                    <div className="flex items-center text-sm text-slate-300">
                      <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {request.distance.toFixed(1)} miles
                    </div>
                  )}
                  {request.suggestedRate && (
                    <div className="flex items-center text-sm text-slate-300">
                      <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ${request.suggestedRate.min.toFixed(2)} - ${request.suggestedRate.max.toFixed(2)}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-slate-400">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDateTime(request.createdAt)}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link
                    href={`/admin/loads?status=QUOTE_REQUESTED&id=${request.id}`}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:shadow-xl hover:shadow-cyan-500/50 transition-all text-center"
                  >
                    Review
                  </Link>
                  <Link
                    href={`/admin/loads?status=QUOTE_REQUESTED`}
                    className="px-4 py-2 text-sm font-medium bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-700/70 border border-slate-600/50 transition-all"
                  >
                    View All
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions - Gold Standard */}
      <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/admin/loads?status=QUOTE_REQUESTED"
            className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center border border-amber-500/30">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Review Quotes</p>
                <p className="text-sm text-slate-400">View all quote requests</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/loads"
            className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-500/30">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">All Loads</p>
                <p className="text-sm text-slate-400">Manage all load requests</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/shippers"
            className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Shippers</p>
                <p className="text-sm text-slate-400">Manage shipper accounts</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
