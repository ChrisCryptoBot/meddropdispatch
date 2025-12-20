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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <p className="text-red-600">Failed to load analytics</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Business insights and performance metrics</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === 'daily'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="glass-primary p-6 rounded-xl border-2 border-blue-200/30 shadow-glass">
          <div className="text-3xl font-bold text-gray-900 mb-1">{analytics.stats.totalLoads}</div>
          <div className="text-sm text-gray-600">Total Loads</div>
        </div>
        <div className="glass-primary p-6 rounded-xl border-2 border-blue-200/30 shadow-glass">
          <div className="text-3xl font-bold text-green-600 mb-1">{analytics.stats.completedLoads}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="glass-primary p-6 rounded-xl border-2 border-blue-200/30 shadow-glass">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            ${analytics.stats.totalRevenue.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </div>
        <div className="glass-primary p-6 rounded-xl border-2 border-blue-200/30 shadow-glass">
          <div className="text-3xl font-bold text-purple-600 mb-1">
            {analytics.stats.completionRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Completion Rate</div>
        </div>
        <div className="glass-primary p-6 rounded-xl border-2 border-blue-200/30 shadow-glass">
          <div className="text-3xl font-bold text-orange-600 mb-1">
            ${analytics.stats.averageRevenuePerLoad.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Avg Revenue/Load</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Breakdown */}
        <div className="glass-primary p-6 rounded-xl border-2 border-blue-200/30 shadow-glass">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Load Volume</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.dailyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Loads by Status */}
        <div className="glass-primary p-6 rounded-xl border-2 border-blue-200/30 shadow-glass">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Loads by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.loadsByStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service Type & Top Shippers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loads by Service Type */}
        <div className="glass-primary p-6 rounded-xl border-2 border-blue-200/30 shadow-glass">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Loads by Service Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.loadsByServiceType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="serviceType" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Shippers */}
        <div className="glass-primary p-6 rounded-xl border-2 border-blue-200/30 shadow-glass">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 Shippers by Volume</h2>
          <div className="space-y-3">
            {analytics.topShippers.map((shipper, index) => (
              <div key={shipper.shipperId} className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{shipper.companyName}</p>
                    <p className="text-xs text-gray-500">{shipper.count} loads</p>
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


