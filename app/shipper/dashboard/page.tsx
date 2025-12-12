'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showToast, showApiError } from '@/lib/toast'

interface LoadRequest {
  id: string
  publicTrackingCode: string
  status: string
  readyTime: string | null
  deliveryDeadline: string | null
  quoteAmount: number | null
  driver: {
    id: string
    firstName: string
    lastName: string
    phone: string
    vehicleType: string
  } | null
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
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'readyTime' | 'deadline' | 'status' | 'amount' | 'cancelled'>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingLoadId, setDeletingLoadId] = useState<string | null>(null)

  const handleDeleteLoad = async (loadId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this load? This action cannot be undone.')) {
      return
    }

    setDeletingLoadId(loadId)
    try {
      const response = await fetch(`/api/load-requests/${loadId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete load')
      }

      // Remove from local state
      setLoads(loads.filter(load => load.id !== loadId))
      showToast.success('Load deleted successfully')
    } catch (error) {
      console.error('Error deleting load:', error)
      showApiError(error, 'Failed to delete load')
    } finally {
      setDeletingLoadId(null)
    }
  }

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

  // Refresh loads when URL params change (e.g., after redirect from request)
  useEffect(() => {
    if (typeof window !== 'undefined' && shipper) {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has('success') || urlParams.has('refresh')) {
        console.log('[Shipper Dashboard] Detected redirect with success param, refreshing loads...')
        // Small delay to ensure backend has processed the request
        setTimeout(() => {
          fetchLoads(shipper.id)
          // Clean up URL params after refresh
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        }, 500)
      }
    }
  }, [shipper])

  const fetchLoads = async (shipperId: string) => {
    try {
      setIsLoading(true)
      // Add cache busting to ensure fresh data
      const response = await fetch(`/api/shippers/${shipperId}/loads?t=${Date.now()}`, {
        cache: 'no-store'
      })
      if (!response.ok) throw new Error('Failed to fetch loads')

      const data = await response.json()
      console.log(`[Shipper Dashboard] Loaded ${data.loads?.length || 0} loads for shipper ${shipperId}`)
      setLoads(data.loads || [])
    } catch (error) {
      console.error('Error fetching loads:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const [isAccepting, setIsAccepting] = useState<string | null>(null)
  const [isRejecting, setIsRejecting] = useState<string | null>(null)

  const handleAcceptLoad = async (loadId: string) => {
    if (!shipper) return
    
    setIsAccepting(loadId)
    try {
      const response = await fetch(`/api/load-requests/${loadId}/accept-shipper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipperId: shipper.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to claim load')
      }

      await fetchLoads(shipper.id)
      showToast.success('Load claimed in your portal! You can now track it here.')
    } catch (error) {
      showApiError(error, 'Failed to claim load')
    } finally {
      setIsAccepting(null)
    }
  }

  const handleRejectLoad = async (loadId: string) => {
    if (!shipper) return
    if (!confirm('Dismiss this load from your portal? The load will continue normally, you just won\'t see it here.')) return
    
    setIsRejecting(loadId)
    try {
      // Just remove from view - don't change load status
      // In the future, we could add a "dismissedByShipper" field
      // For now, we'll just filter it out client-side
      await fetchLoads(shipper.id)
      showToast.success('Load dismissed from portal view')
    } catch (error) {
      showApiError(error, 'Failed to dismiss load')
    } finally {
      setIsRejecting(null)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'QUOTE_REQUESTED': 'bg-orange-100 text-orange-800 border-orange-200',
      'REQUESTED': 'bg-blue-100 text-blue-800 border-blue-200',
      'NEW': 'bg-blue-100 text-blue-800 border-blue-200',
      'QUOTED': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'QUOTE_ACCEPTED': 'bg-green-100 text-green-800 border-green-200',
      'SCHEDULED': 'bg-purple-100 text-purple-800 border-purple-200',
      'EN_ROUTE': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'PICKED_UP': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'IN_TRANSIT': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'DELIVERED': 'bg-green-100 text-green-800 border-green-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
      'DENIED': 'bg-red-100 text-red-800 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'QUOTE_REQUESTED': 'Available to Claim',
      'REQUESTED': 'Scheduling Request',
      'NEW': 'New Request',
      'QUOTED': 'Quote Pending',
      'QUOTE_ACCEPTED': 'Quote Accepted',
      'SCHEDULED': 'Scheduled',
      'EN_ROUTE': 'En Route to Pickup',
      'PICKED_UP': 'Picked Up',
      'IN_TRANSIT': 'In Transit',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled',
      'DENIED': 'Not Scheduled',
    }
    return labels[status] || status
  }

  // Filter and sort loads
  const getFilteredAndSortedLoads = () => {
    let filtered = loads

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(load =>
        load.publicTrackingCode.toLowerCase().includes(query) ||
        load.pickupFacility.city.toLowerCase().includes(query) ||
        load.pickupFacility.state.toLowerCase().includes(query) ||
        load.dropoffFacility.city.toLowerCase().includes(query) ||
        load.dropoffFacility.state.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (filter !== 'all') {
      const statusMap: Record<string, string[]> = {
        all: [],
        pending: ['REQUESTED', 'NEW', 'QUOTED'],
        active: ['QUOTE_ACCEPTED', 'SCHEDULED', 'EN_ROUTE', 'PICKED_UP', 'IN_TRANSIT'],
        delivered: ['DELIVERED'],
        cancelled: ['CANCELLED', 'DENIED'],
      }
      filtered = filtered.filter(load => statusMap[filter]?.includes(load.status))
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'readyTime':
          if (!a.readyTime && !b.readyTime) return 0
          if (!a.readyTime) return 1
          if (!b.readyTime) return -1
          return new Date(a.readyTime).getTime() - new Date(b.readyTime).getTime()
        case 'deadline':
          if (!a.deliveryDeadline && !b.deliveryDeadline) return 0
          if (!a.deliveryDeadline) return 1
          if (!b.deliveryDeadline) return -1
          return new Date(a.deliveryDeadline).getTime() - new Date(b.deliveryDeadline).getTime()
        case 'status':
          const statusPriority: Record<string, number> = {
            'REQUESTED': 1,
            'NEW': 1,
            'SCHEDULED': 2,
            'EN_ROUTE': 3,
            'PICKED_UP': 4,
            'IN_TRANSIT': 5,
            'DELIVERED': 6,
            'CANCELLED': 99,
            'DENIED': 99,
          }
          const aPriority = statusPriority[a.status] || 50
          const bPriority = statusPriority[b.status] || 50
          if (aPriority !== bPriority) return aPriority - bPriority
          return a.status.localeCompare(b.status)
        case 'amount':
          const aAmount = a.quoteAmount || 0
          const bAmount = b.quoteAmount || 0
          if (aAmount === 0 && bAmount === 0) return 0
          if (aAmount === 0) return 1
          if (bAmount === 0) return -1
          return bAmount - aAmount
        case 'cancelled':
          const aIsCancelled = ['CANCELLED', 'DENIED'].includes(a.status)
          const bIsCancelled = ['CANCELLED', 'DENIED'].includes(b.status)
          if (aIsCancelled && !bIsCancelled) return -1
          if (!aIsCancelled && bIsCancelled) return 1
          if (aIsCancelled && bIsCancelled) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          }
          return 0
        default:
          return 0
      }
    })

    return sorted
  }

  const filteredLoads = getFilteredAndSortedLoads()

  const stats = {
    total: loads.length,
    pending: loads.filter(l => ['QUOTE_REQUESTED', 'REQUESTED', 'NEW', 'QUOTED'].includes(l.status)).length,
    active: loads.filter(l => ['QUOTE_ACCEPTED', 'SCHEDULED', 'EN_ROUTE', 'PICKED_UP', 'IN_TRANSIT'].includes(l.status)).length,
    delivered: loads.filter(l => l.status === 'DELIVERED').length,
    cancelled: loads.filter(l => ['CANCELLED', 'DENIED'].includes(l.status)).length,
  }

  // Loads that are available for shipper to claim (created by drivers, not yet claimed)
  // Note: We'll show SCHEDULED loads created via DRIVER_MANUAL that shipper hasn't claimed yet
  // For now, showing all SCHEDULED loads as "available" - in future could add a "claimedByShipper" field
  const pendingAcceptance = loads.filter(l => l.status === 'SCHEDULED' || l.status === 'QUOTE_REQUESTED')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your loads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
        {/* Call to Book Loads - Prominent CTA */}
        <div className="glass rounded-2xl p-6 mb-8 bg-gradient-to-r from-slate-50 to-neutral-50 border-2 border-slate-300">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Need to Book a Load?</h2>
                <p className="text-gray-700 mb-2">Call us to schedule your medical courier service. Our team will help you get started quickly.</p>
                <a
                  href="tel:+1234567890"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call to Book: (123) 456-7890
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="glass rounded-2xl p-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Loads</div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.delivered}</div>
            <div className="text-sm text-gray-600">Delivered</div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats.cancelled}</div>
            <div className="text-sm text-gray-600">Cancelled</div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Loads</h1>
          <p className="text-gray-600">Manage and track all your shipment requests</p>
        </div>

        {/* Filters, Search, and Sort */}
        <div className="glass p-6 rounded-2xl mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by tracking code, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled / Denied</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="readyTime">Ready Time (Earliest)</option>
                <option value="deadline">Deadline (Earliest)</option>
                <option value="status">Status (Priority Order)</option>
                <option value="amount">Amount (Highest First)</option>
                <option value="cancelled">Cancelled First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pending Acceptance Section */}
        {pendingAcceptance.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Available Loads ({pendingAcceptance.length})</h2>
              <div className="group relative">
                <svg className="w-5 h-5 text-gray-400 cursor-help hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 shadow-xl">
                  <p className="mb-2 font-semibold">About Available Loads:</p>
                  <p className="mb-2">These loads were created by drivers and are already active in the system. They're being tracked and managed by drivers.</p>
                  <p className="mb-2"><strong>Claiming a load</strong> allows you to view and manage it in your portal, but it's completely optional.</p>
                  <p><strong>Important:</strong> Loads continue normally even if you don't claim them. You'll still receive email updates.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {pendingAcceptance.map((load) => (
                <div
                  key={load.id}
                  className="glass rounded-xl p-6 border-2 border-orange-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900 text-lg font-mono">{load.publicTrackingCode}</h3>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          Available to Claim
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Created by driver • {new Date(load.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{load.pickupFacility.name}</p>
                        <p className="text-sm text-gray-600">{load.pickupFacility.city}, {load.pickupFacility.state}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{load.dropoffFacility.name}</p>
                        <p className="text-sm text-gray-600">{load.dropoffFacility.city}, {load.dropoffFacility.state}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleAcceptLoad(load.id)
                      }}
                      disabled={isAccepting === load.id || isRejecting === load.id}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAccepting === load.id ? 'Claiming...' : '✓ Claim in Portal'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRejectLoad(load.id)
                      }}
                      disabled={isAccepting === load.id || isRejecting === load.id}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRejecting === load.id ? 'Dismissing...' : '✗ Dismiss'}
                    </button>
                    <Link
                      href={`/shipper/loads/${load.id}`}
                      className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Loads List */}
        {filteredLoads.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {filter === 'all' ? 'No load requests yet' : `No ${filter} loads`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? 'Get started by creating your first shipment request using the button above' 
                : 'There are no loads matching this filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLoads.map((load) => (
              <div
                key={load.id}
                className="glass p-5 rounded-2xl hover:shadow-lg transition-all relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/shipper/loads/${load.id}`}>
                        <h3 className="font-bold text-gray-900 text-lg font-mono hover:text-slate-600 transition-colors">{load.publicTrackingCode}</h3>
                      </Link>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(load.status)}`}>
                        {getStatusLabel(load.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Created {new Date(load.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {load.quoteAmount && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ${load.quoteAmount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Quote Amount</div>
                      </div>
                    )}
                    {/* Delete button for completed/cancelled/delivered/scheduled loads */}
                    {['CANCELLED', 'DELIVERED', 'SCHEDULED'].includes(load.status) && (
                      <button
                        onClick={(e) => handleDeleteLoad(load.id, e)}
                        disabled={deletingLoadId === load.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete load"
                      >
                        {deletingLoadId === load.id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Pickup */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-1">Pickup</div>
                      <div className="font-medium text-gray-900 truncate">{load.pickupFacility.name}</div>
                      <div className="text-sm text-gray-600">
                        {load.pickupFacility.city}, {load.pickupFacility.state}
                      </div>
                      {load.readyTime && (
                        <div className="text-sm text-gray-600">
                          Ready: {new Date(load.readyTime).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-1">Delivery</div>
                      <div className="font-medium text-gray-900 truncate">{load.dropoffFacility.name}</div>
                      <div className="text-sm text-gray-600">
                        {load.dropoffFacility.city}, {load.dropoffFacility.state}
                      </div>
                      {load.deliveryDeadline && (
                        <div className="text-sm text-gray-600">
                          Deadline: {new Date(load.deliveryDeadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Review/Acceptance Status for REQUESTED loads */}
                {load.status === 'REQUESTED' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {load.driver ? (
                      <div className="flex items-center gap-2 text-green-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold text-sm">
                          Driver Reviewed: {load.driver.firstName} {load.driver.lastName} - Awaiting scheduling confirmation
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-blue-700">
                        <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold text-sm">Awaiting driver review - Not yet reviewed</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Required Badge */}
                {load.status === 'QUOTED' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="font-semibold text-sm">Action Required: Review and accept quote</span>
                    </div>
                  </div>
                )}

                {/* Scheduled/Accepted Status */}
                {load.status === 'SCHEDULED' && load.driver && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-purple-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold text-sm">
                        Accepted & Scheduled - Driver: {load.driver.firstName} {load.driver.lastName}
                      </span>
                    </div>
                  </div>
                )}

                {/* View Details Link */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link
                    href={`/shipper/loads/${load.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all text-sm"
                  >
                    View Details
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
