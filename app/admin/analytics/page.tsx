'use client'

// Admin Analytics Dashboard
// Display analytics and statistics

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

interface AnalyticsData {
  period: string
  startDate: string
  endDate: string
  stats: {
    totalLoads: number
    completedLoads: number
    totalRevenue: number
    completionRate: number
    averageRevenuePerLoad: number
  }
  loadsByStatus: Array<{ status: string; count: number }>
  loadsByServiceType: Array<{ serviceType: string; count: number }>
  topShippers: Array<{ shipperId: string; companyName: string; count: number }>
  dailyBreakdown: Array<{ date: string; count: number }>
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  useEffect(() => {
    // Check if admin is logged in
    const adminData = localStorage.getItem('admin')
    if (!adminData) {
      router.push('/admin/login')
      return
    }

    fetchAnalytics()
  }, [router, period])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/analytics?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-red-400">Failed to load analytics</p>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-0 z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-slate-400">Business insights and performance metrics</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === 'daily'
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700/70 border border-slate-600/50'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === 'weekly'
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700/70 border border-slate-600/50'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === 'monthly'
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700/70 border border-slate-600/50'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Gold Standard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{analytics.stats.totalLoads}</p>
            <p className="text-sm text-slate-400 font-medium">Total Loads</p>
          </div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-green-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{analytics.stats.completedLoads}</p>
            <p className="text-sm text-slate-400 font-medium">Completed</p>
          </div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">
              ${analytics.stats.totalRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-slate-400 font-medium">Total Revenue</p>
          </div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-purple-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">
              {analytics.stats.completionRate.toFixed(1)}%
            </p>
            <p className="text-sm text-slate-400 font-medium">Completion Rate</p>
          </div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-orange-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">
              ${analytics.stats.averageRevenuePerLoad.toFixed(2)}
            </p>
            <p className="text-sm text-slate-400 font-medium">Avg Revenue/Load</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Breakdown */}
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Daily Load Volume</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.dailyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Loads by Status */}
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Loads by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.loadsByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="status" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="count" fill="#22d3ee" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service Type & Top Shippers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loads by Service Type */}
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Loads by Service Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.loadsByServiceType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="serviceType" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Legend />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Shippers */}
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Top 5 Shippers by Volume</h2>
          <div className="space-y-3">
            {analytics.topShippers.map((shipper, index) => (
              <div key={shipper.shipperId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center font-bold text-cyan-400 border border-cyan-500/30">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{shipper.companyName}</p>
                    <p className="text-xs text-slate-500">{shipper.count} loads</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


