'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SystemHealth {
  database: {
    status: 'healthy' | 'degraded' | 'down'
    responseTime: number
    lastCheck: string
  }
  api: {
    status: 'healthy' | 'degraded' | 'down'
    responseTime: number
    lastCheck: string
  }
  storage: {
    status: 'healthy' | 'degraded' | 'down'
    used: number
    total: number
  }
  errors: {
    count24h: number
    count7d: number
    recent: Array<{
      message: string
      timestamp: string
    }>
  }
}

export default function SystemDiagnosticsPage() {
  const router = useRouter()
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    const adminMode = localStorage.getItem('driverAdminMode') === 'true'
    
    if (!driverData || !adminMode) {
      router.push('/driver/login')
      return
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [router])

  const fetchHealth = async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch('/api/admin/diagnostics')
      if (response.ok) {
        const data = await response.json()
        setHealth(data)
      }
    } catch (error) {
      console.error('Error fetching system health:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200'
      case 'degraded': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'down': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading system diagnostics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">System Diagnostics</h1>
          <p className="text-gray-600">Monitor system health and performance</p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={isRefreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {health && (
        <div className="space-y-6">
          {/* Database Health */}
          <div className="glass-primary rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Database</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-600">Status</span>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getStatusColor(health.database.status)}`}>
                    {health.database.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Response Time</span>
                <p className="text-lg font-bold text-gray-900">{health.database.responseTime}ms</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Last Check</span>
                <p className="text-sm text-gray-700">{new Date(health.database.lastCheck).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* API Health */}
          <div className="glass-primary rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass">
            <h2 className="text-xl font-bold text-gray-900 mb-4">API</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-600">Status</span>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getStatusColor(health.api.status)}`}>
                    {health.api.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Response Time</span>
                <p className="text-lg font-bold text-gray-900">{health.api.responseTime}ms</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Last Check</span>
                <p className="text-sm text-gray-700">{new Date(health.api.lastCheck).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Error Summary */}
          <div className="glass-primary rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Error Summary</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-600">Errors (24h)</span>
                <p className="text-2xl font-bold text-gray-900">{health.errors.count24h}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Errors (7d)</span>
                <p className="text-2xl font-bold text-gray-900">{health.errors.count7d}</p>
              </div>
            </div>
            {health.errors.recent.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Errors</h3>
                <div className="space-y-2">
                  {health.errors.recent.map((error, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-900">{error.message}</p>
                      <p className="text-xs text-red-600 mt-1">{new Date(error.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

