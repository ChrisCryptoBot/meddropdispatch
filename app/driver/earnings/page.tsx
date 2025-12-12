'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatCurrency, formatDateTime } from '@/lib/utils'

interface LoadEarning {
  id: string
  publicTrackingCode: string
  quoteAmount: number | null
  status: string
  actualDeliveryTime: string | null
  createdAt: string
  shipper: {
    companyName: string
  }
  pickupFacility: {
    city: string
    state: string
  }
  dropoffFacility: {
    city: string
    state: string
  }
}

export default function DriverEarningsPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [loads, setLoads] = useState<LoadEarning[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsed = JSON.parse(driverData)
    setDriver(parsed)
    fetchDriverLoads(parsed.id)
  }, [router])

  const fetchDriverLoads = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/loads`)
      if (!response.ok) throw new Error('Failed to fetch loads')

      const data = await response.json()
      setLoads(data.loads || [])
    } catch (error) {
      console.error('Error fetching driver loads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate stats
  const completedLoads = loads.filter((load) => 
    load.status === 'DELIVERED'
  )
  
  const totalEarned = completedLoads.reduce((sum, load) => sum + (load.quoteAmount || 0), 0)
  
  // Filter by date range
  const now = new Date()
  const thisMonth = completedLoads.filter((load) => {
    if (!load.actualDeliveryTime) return false
    const date = new Date(load.actualDeliveryTime)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })
  const thisMonthEarned = thisMonth.reduce((sum, load) => sum + (load.quoteAmount || 0), 0)

  const thisYear = completedLoads.filter((load) => {
    if (!load.actualDeliveryTime) return false
    const date = new Date(load.actualDeliveryTime)
    return date.getFullYear() === now.getFullYear()
  })
  const thisYearEarned = thisYear.reduce((sum, load) => sum + (load.quoteAmount || 0), 0)

  // Filter loads for display
  const filteredLoads = loads.filter((load) => {
    if (filter === 'all') return load.status === 'DELIVERED'
    if (filter === 'pending') return load.status !== 'DELIVERED'
    if (filter === 'completed') return load.status === 'DELIVERED'
    return true
  })

  const getStatusColor = (status: string) => {
    if (status === 'DELIVERED') return 'bg-green-100 text-green-700 border-green-300'
    if (status === 'IN_TRANSIT' || status === 'PICKED_UP') return 'bg-blue-100 text-blue-700 border-blue-300'
    return 'bg-gray-100 text-gray-700 border-gray-300'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'DELIVERED': 'Delivered',
      'IN_TRANSIT': 'In Transit',
      'PICKED_UP': 'Picked Up',
      'SCHEDULED': 'Scheduled',
    }
    return labels[status] || status
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading earnings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Earnings</h1>
        <p className="text-gray-600">Track your earnings and completed loads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(totalEarned)}</div>
          <div className="text-sm text-gray-600">Total Earned</div>
          <div className="text-xs text-gray-500 mt-1">{completedLoads.length} completed loads</div>
        </div>
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-blue-600 mb-1">{formatCurrency(thisMonthEarned)}</div>
          <div className="text-sm text-gray-600">This Month</div>
          <div className="text-xs text-gray-500 mt-1">{thisMonth.length} loads</div>
        </div>
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-green-600 mb-1">{formatCurrency(thisYearEarned)}</div>
          <div className="text-sm text-gray-600">This Year</div>
          <div className="text-xs text-gray-500 mt-1">{thisYear.length} loads</div>
        </div>
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-slate-600 mb-1">{loads.filter(l => l.status === 'DELIVERED').length}</div>
          <div className="text-sm text-gray-600">Completed Loads</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All Completed' },
          { key: 'completed', label: 'Completed' },
          { key: 'pending', label: 'Pending Payment' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              filter === key
                ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg'
                : 'glass text-gray-700 hover:bg-white/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Earnings Breakdown */}
      {filteredLoads.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No earnings yet</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? 'Completed loads will appear here with earnings information'
              : 'No loads match this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLoads.map((load) => (
            <div key={load.id} className="glass rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/driver/loads/${load.id}`}
                      className="font-bold text-gray-900 text-lg hover:text-slate-600 transition-colors"
                    >
                      {load.publicTrackingCode}
                    </Link>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        getStatusColor(load.status)
                      }`}
                    >
                      {getStatusLabel(load.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Client: <span className="font-medium">{load.shipper.companyName}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Route: {load.pickupFacility.city}, {load.pickupFacility.state} → {load.dropoffFacility.city}, {load.dropoffFacility.state}
                  </p>
                  {load.actualDeliveryTime && (
                    <p className="text-sm text-gray-500 mt-2">
                      Delivered: {formatDateTime(load.actualDeliveryTime)}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  {load.quoteAmount ? (
                    <>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {formatCurrency(load.quoteAmount)}
                      </div>
                      <p className="text-xs text-gray-500">Earnings</p>
                    </>
                  ) : (
                    <div className="text-sm text-gray-400">No quote set</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
