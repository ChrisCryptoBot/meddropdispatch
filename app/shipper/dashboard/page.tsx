'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LoadRequest {
  id: string
  trackingCode: string
  status: string
  pickupDate: string
  deliveryDate: string | null
  quoteAmount: number | null
  pickupFacility: {
    name: string
    city: string
    state: string
  }
  dropoffFacility: {
    name: string
    city: string
    state: string
  }
  createdAt: string
}

export default function ShipperDashboardPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [loads, setLoads] = useState<LoadRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    // Check authentication
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    const parsedShipper = JSON.parse(shipperData)
    setShipper(parsedShipper)

    // Fetch loads
    fetchLoads(parsedShipper.id)
  }, [router])

  const fetchLoads = async (shipperId: string) => {
    try {
      const response = await fetch(`/api/shippers/${shipperId}/loads`)
      if (!response.ok) throw new Error('Failed to fetch loads')

      const data = await response.json()
      setLoads(data.loads || [])
    } catch (error) {
      console.error('Error fetching loads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('shipper')
    router.push('/shipper/login')
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'NEW': 'bg-blue-100 text-blue-800 border-blue-200',
      'QUOTED': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'QUOTE_ACCEPTED': 'bg-green-100 text-green-800 border-green-200',
      'SCHEDULED': 'bg-purple-100 text-purple-800 border-purple-200',
      'PICKED_UP': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'IN_TRANSIT': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'DELIVERED': 'bg-green-100 text-green-800 border-green-200',
      'COMPLETED': 'bg-gray-100 text-gray-800 border-gray-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'NEW': 'New Request',
      'QUOTED': 'Quote Pending',
      'QUOTE_ACCEPTED': 'Quote Accepted',
      'SCHEDULED': 'Scheduled',
      'PICKED_UP': 'Picked Up',
      'IN_TRANSIT': 'In Transit',
      'DELIVERED': 'Delivered',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
    }
    return labels[status] || status
  }

  const filteredLoads = loads.filter(load => {
    if (filter === 'all') return true
    if (filter === 'pending') return ['NEW', 'QUOTED'].includes(load.status)
    if (filter === 'active') return ['QUOTE_ACCEPTED', 'SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(load.status)
    if (filter === 'completed') return ['DELIVERED', 'COMPLETED'].includes(load.status)
    return true
  })

  const stats = {
    total: loads.length,
    pending: loads.filter(l => ['NEW', 'QUOTED'].includes(l.status)).length,
    active: loads.filter(l => ['QUOTE_ACCEPTED', 'SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(l.status)).length,
    completed: loads.filter(l => ['DELIVERED', 'COMPLETED'].includes(l.status)).length,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MED DROP
              </h1>
              <p className="text-sm text-gray-600">Welcome back, {shipper?.companyName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Loads</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
            <div className="text-3xl font-bold text-yellow-600 mb-1">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending Quotes</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.active}</div>
            <div className="text-sm text-gray-600">Active Shipments</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
            <div className="text-3xl font-bold text-green-600 mb-1">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">My Loads</h2>
          <Link
            href="/request-load"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all text-sm"
          >
            + New Load Request
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending Quotes' },
            { key: 'active', label: 'Active' },
            { key: 'completed', label: 'Completed' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/80 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loads List */}
        {filteredLoads.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 text-center border border-gray-200">
            <div className="text-gray-400 text-5xl mb-4">📦</div>
            <p className="text-gray-600 mb-4">
              {filter === 'all' ? 'No load requests yet' : `No ${filter} loads`}
            </p>
            {filter === 'all' && (
              <Link
                href="/request-load"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Create Your First Load
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLoads.map((load) => (
              <Link
                key={load.id}
                href={`/shipper/loads/${load.id}`}
                className="block bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">{load.trackingCode}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(load.status)}`}>
                        {getStatusLabel(load.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Created {new Date(load.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {load.quoteAmount && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        ${load.quoteAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">Quote Amount</div>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Pickup */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-green-600 text-sm">📍</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-1">Pickup</div>
                      <div className="font-medium text-gray-900 truncate">{load.pickupFacility.name}</div>
                      <div className="text-sm text-gray-600">
                        {load.pickupFacility.city}, {load.pickupFacility.state}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(load.pickupDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Delivery */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-blue-600 text-sm">🏁</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-1">Delivery</div>
                      <div className="font-medium text-gray-900 truncate">{load.dropoffFacility.name}</div>
                      <div className="text-sm text-gray-600">
                        {load.dropoffFacility.city}, {load.dropoffFacility.state}
                      </div>
                      {load.deliveryDate && (
                        <div className="text-sm text-gray-600">
                          {new Date(load.deliveryDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Required Badge */}
                {load.status === 'QUOTED' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <span className="text-lg">⚠️</span>
                      <span className="font-semibold text-sm">Action Required: Review and accept quote</span>
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
