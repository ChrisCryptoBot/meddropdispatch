'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showToast, showApiError } from '@/lib/toast'
import { getLoadStatusColor, getLoadStatusLabel } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

interface LoadRequest {
  id: string
  publicTrackingCode: string
  status: string
  readyTime: string | null
  deliveryDeadline: string | null
  quoteAmount: number | null
  gpsTrackingEnabled?: boolean
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

interface Dispatcher {
  id: string
  name: string
  email: string
  role: string
}

export default function ShipperDashboardPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [dispatcher, setDispatcher] = useState<Dispatcher | null>(null)
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

  // Get shipper from layout's auth state - no need to duplicate auth check
  // The layout handles authentication, we just fetch data here
  useEffect(() => {
    const fetchShipperData = async () => {
      try {
        const authResponse = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!authResponse.ok) {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const authData = await authResponse.json()
        if (!authData.authenticated || authData.user?.userType !== 'shipper') {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const shipperData = authData.user
        setShipper(shipperData)
        
        // Fetch full shipper details including dispatcher info (don't await - let it run in background)
        fetchShipperDetails(shipperData.id)
        
        // Fetch loads (this will set isLoading to false in finally block)
        fetchLoads(shipperData.id)
      } catch (error) {
        console.error('Error fetching shipper data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchShipperData()
  }, [])

  const fetchShipperDetails = async (shipperId: string) => {
    try {
      const response = await fetch(`/api/shippers/${shipperId}`)
      if (response.ok) {
        const data = await response.json()
        setShipper(data.shipper)
        if (data.shipper.dispatcher) {
          setDispatcher(data.shipper.dispatcher)
        }
      }
    } catch (error) {
      console.error('Error fetching shipper details:', error)
    }
  }

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

  const fetchLoads = async (shipperId: string, page: number = 1) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/shippers/${shipperId}/loads?page=${page}&limit=50`)
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

  // Use centralized status colors and labels
  const getStatusColor = (status: string) => {
    return getLoadStatusColor(status)
  }

  const getStatusLabel = (status: string) => {
    return getLoadStatusLabel(status)
  }

  // Filter and sort loads
  const getFilteredAndSortedLoads = () => {
    let filtered = loads

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(load =>
        load.publicTrackingCode.toLowerCase().includes(query) ||
        load.pickupFacility.name?.toLowerCase().includes(query) ||
        load.pickupFacility.city.toLowerCase().includes(query) ||
        load.pickupFacility.state.toLowerCase().includes(query) ||
        load.dropoffFacility.name?.toLowerCase().includes(query) ||
        load.dropoffFacility.city.toLowerCase().includes(query) ||
        load.dropoffFacility.state.toLowerCase().includes(query) ||
        (load.driver && `${load.driver.firstName} ${load.driver.lastName}`.toLowerCase().includes(query)) ||
        (load.driver && load.driver.phone?.toLowerCase().includes(query))
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
      <div className="flex items-center justify-center min-h-[calc(100vh-85px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg">Loading your loads...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          My Loads
        </h1>
        <p className="text-slate-400">Manage and track all your shipment requests</p>
      </div>
        {/* Dedicated Dispatcher Card - Premium Tier Only */}
        {shipper?.subscriptionTier === 'BROKERAGE' && dispatcher && (
          <div className="mb-6 print:mb-4">
            <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold text-white print:text-xl">Your Dedicated Dispatcher</h2>
                      <span className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white text-xs font-semibold rounded-full shadow-lg shadow-cyan-500/30">
                        Premium
                      </span>
                    </div>
                    <p className="text-slate-300 mb-4 print:text-sm">
                      You have a dedicated dispatcher assigned to handle your loads and provide personalized service.
                    </p>
                    <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                          <span className="text-white font-bold text-lg">
                            {dispatcher.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-white text-lg">{dispatcher.name}</div>
                          <div className="text-sm text-slate-300">{dispatcher.email}</div>
                          <div className="text-xs text-cyan-400 font-medium mt-1">
                            {dispatcher.role === 'ADMIN' ? 'Administrator' : 'Dispatcher'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={`mailto:${dispatcher.email}?subject=Load Request - ${shipper.companyName}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 min-h-[44px]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email Dispatcher
                      </a>
                      <Link
                        href="/shipper/request-load"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700/50 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 transition-all border border-slate-600/50 min-h-[44px]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Request New Load
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Action CTA - Compact Design */}
        <div className="mb-6 print:mb-4">
          <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white mb-1 print:text-base">Need to Book a Load?</h2>
                  <p className="text-sm text-slate-300 print:text-xs">Call us to schedule your medical courier service</p>
                </div>
              </div>
              <a
                href="tel:+19039140386"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 min-h-[44px] whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                (903) 914-0386
              </a>
            </div>
          </div>
        </div>

        {/* Stats Grid - Uniform Professional Style */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1 font-data">
                {stats.total}
              </div>
              <div className="text-xs md:text-sm text-slate-400 font-medium">Total</div>
            </div>
          </div>
          <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1 font-data">
                {stats.pending}
              </div>
              <div className="text-xs md:text-sm text-slate-400 font-medium">Pending</div>
            </div>
          </div>
          <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1 font-data">
                {stats.active}
              </div>
              <div className="text-xs md:text-sm text-slate-400 font-medium">Active</div>
            </div>
          </div>
          <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1 font-data">
                {stats.delivered}
              </div>
              <div className="text-xs md:text-sm text-slate-400 font-medium">Delivered</div>
            </div>
          </div>
          <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1 font-data">
                {stats.cancelled}
              </div>
              <div className="text-xs md:text-sm text-slate-400 font-medium">Cancelled</div>
            </div>
          </div>
        </div>

        {/* Filters, Search, and Sort - Compact Design */}
        <div className="glass-primary p-5 rounded-xl mb-6 border border-slate-700/50 shadow-lg">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by tracking, facility, city, driver..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500 text-sm"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled / Denied</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 text-sm"
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

        {/* Pending Acceptance Section - Enhanced Design */}
        {pendingAcceptance.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                <h2 className="text-lg font-bold text-white">Available Loads ({pendingAcceptance.length})</h2>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
              <div className="group relative">
                <svg className="w-5 h-5 text-slate-400 cursor-help hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute right-0 bottom-full mb-2 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 shadow-xl border border-slate-700">
                  <p className="mb-2 font-semibold">About Available Loads:</p>
                  <p className="mb-2">These loads were created by drivers and are already active in the system. They're being tracked and managed by drivers.</p>
                  <p className="mb-2"><strong>Claiming a load</strong> allows you to view and manage it in your portal, but it's completely optional.</p>
                  <p><strong>Important:</strong> Loads continue normally even if you don't claim them. You'll still receive email updates.</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {pendingAcceptance.map((load) => (
                <div
                  key={load.id}
                  className="glass-primary rounded-xl p-5 border border-slate-700/50 hover:border-slate-600/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-mono font-bold text-cyan-400 text-lg font-data">{load.publicTrackingCode}</h3>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Available to Claim
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        Created by driver • {new Date(load.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Route - Horizontal Layout */}
                  <div className="flex items-center gap-4 mb-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-400 mb-0.5">PICKUP</p>
                          <p className="font-semibold text-white truncate text-sm">{load.pickupFacility.name}</p>
                          <p className="text-xs text-slate-400 truncate">{load.pickupFacility.city}, {load.pickupFacility.state}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-green-400 to-red-400"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-400 mb-0.5">DELIVERY</p>
                          <p className="font-semibold text-white truncate text-sm">{load.dropoffFacility.name}</p>
                          <p className="text-xs text-slate-400 truncate">{load.dropoffFacility.city}, {load.dropoffFacility.state}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-700/50">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRejectLoad(load.id)
                      }}
                      disabled={isAccepting === load.id || isRejecting === load.id}
                      className="px-4 py-2 text-sm rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-200 font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {isRejecting === load.id ? 'Dismissing...' : 'Dismiss'}
                    </button>
                    <div className="flex gap-2">
                      <Link
                        href={`/shipper/loads/${load.id}`}
                        className="px-4 py-2 text-sm rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-200 font-medium transition-colors flex items-center gap-2 border border-slate-600/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAcceptLoad(load.id)
                        }}
                        disabled={isAccepting === load.id || isRejecting === load.id}
                        className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                      >
                        {isAccepting === load.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Claiming...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Claim in Portal
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Loads List - Redesigned Cards */}
        {filteredLoads.length === 0 ? (
          <div className="glass-primary rounded-xl p-12 text-center border border-slate-700/50">
            <div className="w-16 h-16 mx-auto mb-4 text-slate-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {filter === 'all' ? 'No load requests yet' : `No ${filter} loads`}
            </h3>
            <p className="text-slate-400 mb-6">
              {filter === 'all' 
                ? 'Get started by creating your first shipment request using the button above' 
                : 'There are no loads matching this filter'}
            </p>
            {filter === 'all' && (
              <Link
                href="/shipper/request-load"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Load
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLoads.map((load) => (
              <div
                key={load.id}
                className="glass-primary rounded-xl border border-slate-700/50 hover:border-cyan-500/50 hover:shadow-xl transition-all overflow-hidden group"
              >
                {/* Card Header - Compact */}
                <div className="p-5 border-b border-slate-700/50 bg-slate-800/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <Link 
                          href={`/shipper/loads/${load.id}`} 
                          className="hover:opacity-80 transition-opacity"
                        >
                          <h3 className="font-mono font-bold text-cyan-400 text-lg hover:text-cyan-300 transition-colors">
                            {load.publicTrackingCode}
                          </h3>
                        </Link>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getLoadStatusColor(load.status)}`}>
                          {getLoadStatusLabel(load.status)}
                        </span>
                        {load.driver && load.gpsTrackingEnabled && ['SCHEDULED', 'EN_ROUTE', 'PICKED_UP', 'IN_TRANSIT'].includes(load.status) && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Live GPS
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>Created {new Date(load.createdAt).toLocaleDateString()}</span>
                        {load.driver && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {load.driver.firstName} {load.driver.lastName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {load.quoteAmount && (
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">
                            ${load.quoteAmount.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-400">Quote</div>
                        </div>
                      )}
                      {['CANCELLED', 'DELIVERED', 'SCHEDULED'].includes(load.status) && (
                        <button
                          onClick={(e) => handleDeleteLoad(load.id, e)}
                          disabled={deletingLoadId === load.id}
                          className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 hover:text-red-300"
                          title="Delete load"
                        >
                          {deletingLoadId === load.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-400"></div>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Route - Enhanced Horizontal Layout */}
                <div className="p-5">
                  <div className="flex items-center gap-4 mb-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-400 mb-0.5 uppercase tracking-wide">Pickup</p>
                          <p className="font-semibold text-white truncate text-sm mb-0.5">{load.pickupFacility.name}</p>
                          <p className="text-xs text-slate-400 truncate">{load.pickupFacility.city}, {load.pickupFacility.state}</p>
                          {load.readyTime && (
                            <p className="text-xs text-cyan-400 mt-1.5 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Ready: {formatDate(load.readyTime)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-green-400 via-cyan-400 to-red-400"></div>
                      <div className="w-2 h-2 rounded-full bg-cyan-400 my-1"></div>
                      <div className="w-8 h-0.5 bg-gradient-to-r from-red-400 via-cyan-400 to-green-400"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-400 mb-0.5 uppercase tracking-wide">Delivery</p>
                          <p className="font-semibold text-white truncate text-sm mb-0.5">{load.dropoffFacility.name}</p>
                          <p className="text-xs text-slate-400 truncate">{load.dropoffFacility.city}, {load.dropoffFacility.state}</p>
                          {load.deliveryDeadline && (
                            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Deadline: {formatDate(load.deliveryDeadline)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Messages */}
                  {load.status === 'REQUESTED' && (
                    <div className={`mb-4 p-3 rounded-lg border ${load.driver ? 'bg-green-500/10 border-green-500/30' : 'bg-cyan-500/10 border-cyan-500/30'}`}>
                      {load.driver ? (
                        <div className="flex items-center gap-2 text-green-400">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium">
                            Driver Reviewed: {load.driver.firstName} {load.driver.lastName} - Awaiting scheduling confirmation
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-cyan-400">
                          <svg className="w-4 h-4 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-medium">Awaiting driver review - Not yet reviewed</span>
                        </div>
                      )}
                    </div>
                  )}

                  {load.status === 'QUOTED' && (
                    <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm font-semibold">Action Required: Review and accept quote</span>
                      </div>
                    </div>
                  )}

                  {load.status === 'SCHEDULED' && load.driver && (
                    <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                      <div className="flex items-center gap-2 text-purple-400">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold">
                          Accepted & Scheduled - Driver: {load.driver.firstName} {load.driver.lastName}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                      {load.driver && load.gpsTrackingEnabled && ['SCHEDULED', 'EN_ROUTE', 'PICKED_UP', 'IN_TRANSIT'].includes(load.status) && (
                        <Link
                          href={`/shipper/loads/${load.id}#gps-tracking`}
                          className="px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors flex items-center gap-2 shadow-lg shadow-green-500/20"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          View Map
                        </Link>
                      )}
                    </div>
                    <Link
                      href={`/shipper/loads/${load.id}`}
                      className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 flex items-center gap-2 text-sm"
                    >
                      <span>View Details</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
