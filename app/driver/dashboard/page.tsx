'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDateTime, formatDate } from '@/lib/utils'
import { LOAD_STATUS_COLORS, LOAD_STATUS_LABELS } from '@/lib/constants'

interface Driver {
  id: string
  firstName: string
  lastName: string
  email: string
  status: string
  vehicleType: string
  vehiclePlate: string
}

interface Load {
  id: string
  publicTrackingCode: string
  status: string
  serviceType: string
  quoteAmount?: number
  actualPickupTime?: string
  actualDeliveryTime?: string
  pickupSignature?: string
  deliverySignature?: string
  pickupTemperature?: number
  deliveryTemperature?: number
  pickupFacility: {
    name: string
    city: string
    state: string
    addressLine1: string
    contactPhone: string
  }
  dropoffFacility: {
    name: string
    city: string
    state: string
    addressLine1: string
    contactPhone: string
  }
  readyTime?: string
  deliveryDeadline?: string
  commodityDescription: string
  temperatureRequirement: string
  estimatedContainers?: number
  driver?: {
    id: string
    firstName: string
    lastName: string
  }
  documents?: Array<{
    id: string
    type: string
    title: string
    createdAt: string
    uploadedBy: string | null
  }>
  trackingEvents?: Array<{
    id: string
    label: string
    createdAt: string
    locationText?: string
  }>
  createdAt: string
}

type SortOption = 'newest' | 'oldest' | 'readyTime' | 'deadline' | 'status' | 'amount' | 'cancelled'
type FilterOption = 'all' | 'new' | 'quoted' | 'scheduled' | 'pickedUp' | 'inTransit' | 'cancelled'

export default function DriverDashboardPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [allLoads, setAllLoads] = useState<Load[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDenyModal, setShowDenyModal] = useState(false)
  const [denyLoadId, setDenyLoadId] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState<string>('OTHER')
  const [denyNotes, setDenyNotes] = useState('')
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quoteLoadId, setQuoteLoadId] = useState<string | null>(null)
  const [quoteAmount, setQuoteAmount] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Check if driver is logged in
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsedDriver = JSON.parse(driverData)
    setDriver(parsedDriver)

    // Fetch all loads
    fetchLoads(parsedDriver.id)
  }, [router])

  const fetchLoads = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/loads`)
      if (!response.ok) throw new Error('Failed to fetch loads')
      const data = await response.json()
      setAllLoads(data.loads || [])
    } catch (error) {
      console.error('Error fetching loads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptLoad = async (loadId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!driver) return

    if (!confirm('Accept this scheduling request? You should call the shipper first to confirm details and pricing before accepting.')) {
      return
    }

    try {
      const response = await fetch(`/api/load-requests/${loadId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driver.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept load')
      }

      // Refresh loads
      await fetchLoads(driver.id)
      alert('Load scheduled! Tracking is now active.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to accept load')
    }
  }

  const handleDenyLoad = async () => {
    if (!driver || !denyLoadId || !denyReason) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/load-requests/${denyLoadId}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          reason: denyReason,
          notes: denyNotes || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to deny load')
      }

      // Refresh loads and close modal
      await fetchLoads(driver.id)
      setShowDenyModal(false)
      setDenyLoadId(null)
      setDenyReason('OTHER')
      setDenyNotes('')
      alert('Load denied. Load is now available for other drivers.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to deny load')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitQuote = async () => {
    if (!driver || !quoteLoadId || !quoteAmount) {
      alert('Please enter a quote amount')
      return
    }

    const amount = parseFloat(quoteAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid quote amount')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/load-requests/${quoteLoadId}/submit-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          quoteAmount: amount,
          notes: quoteNotes || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit quote')
      }

      // Refresh loads and close modal
      await fetchLoads(driver.id)
      setShowQuoteModal(false)
      setQuoteLoadId(null)
      setQuoteAmount('')
      setQuoteNotes('')
      alert('Quote submitted successfully! Waiting for shipper approval.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit quote')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get driver's accepted loads (loads assigned to this driver)
  const myLoads = allLoads.filter(load => load.driver?.id === driver?.id)

  // Filter and sort loads based on current settings
  const getFilteredAndSortedLoads = (loads: Load[]) => {
    let filtered = loads

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(load =>
        load.publicTrackingCode.toLowerCase().includes(query) ||
        load.pickupFacility.city.toLowerCase().includes(query) ||
        load.pickupFacility.state.toLowerCase().includes(query) ||
        load.dropoffFacility.city.toLowerCase().includes(query) ||
        load.dropoffFacility.state.toLowerCase().includes(query) ||
        load.commodityDescription.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (filterBy !== 'all') {
      const statusMap: Record<FilterOption, string[]> = {
        all: [],
        new: ['REQUESTED', 'NEW'],
        quoted: ['QUOTED', 'QUOTE_ACCEPTED'],
        scheduled: ['SCHEDULED', 'EN_ROUTE'],
        pickedUp: ['PICKED_UP'],
        inTransit: ['IN_TRANSIT'],
        cancelled: ['CANCELLED', 'DENIED'],
      }
      filtered = filtered.filter(load => statusMap[filterBy].includes(load.status))
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'readyTime':
          // Nulls go to end
          if (!a.readyTime && !b.readyTime) return 0
          if (!a.readyTime) return 1
          if (!b.readyTime) return -1
          return new Date(a.readyTime).getTime() - new Date(b.readyTime).getTime()
        case 'deadline':
          // Nulls go to end
          if (!a.deliveryDeadline && !b.deliveryDeadline) return 0
          if (!a.deliveryDeadline) return 1
          if (!b.deliveryDeadline) return -1
          return new Date(a.deliveryDeadline).getTime() - new Date(b.deliveryDeadline).getTime()
        case 'status':
          // Sort by status priority: cancelled/denied at end, then by alphabetical
          const statusPriority: Record<string, number> = {
            'REQUESTED': 1,
            'NEW': 1,
            'SCHEDULED': 2,
            'EN_ROUTE': 3,
            'PICKED_UP': 4,
            'IN_TRANSIT': 5,
            'DELIVERED': 6,
            'COMPLETED': 7,
            'CANCELLED': 99,
            'DENIED': 99,
          }
          const aPriority = statusPriority[a.status] || 50
          const bPriority = statusPriority[b.status] || 50
          if (aPriority !== bPriority) return aPriority - bPriority
          return a.status.localeCompare(b.status)
        case 'amount':
          // Nulls go to end
          const aAmount = a.quoteAmount || 0
          const bAmount = b.quoteAmount || 0
          if (aAmount === 0 && bAmount === 0) return 0
          if (aAmount === 0) return 1
          if (bAmount === 0) return -1
          return bAmount - aAmount
        case 'cancelled':
          // Sort cancelled/denied to top, then by cancellation date
          const aIsCancelled = ['CANCELLED', 'DENIED'].includes(a.status)
          const bIsCancelled = ['CANCELLED', 'DENIED'].includes(b.status)
          if (aIsCancelled && !bIsCancelled) return -1
          if (!aIsCancelled && bIsCancelled) return 1
          if (aIsCancelled && bIsCancelled) {
            // Both cancelled - sort by cancelled date if available, else by createdAt
            const aDate = (a as any).cancelledAt ? new Date((a as any).cancelledAt).getTime() : new Date(a.createdAt).getTime()
            const bDate = (b as any).cancelledAt ? new Date((b as any).cancelledAt).getTime() : new Date(b.createdAt).getTime()
            return bDate - aDate // Most recently cancelled first
          }
          return 0
        default:
          return 0
      }
    })

    return sorted
  }

  const displayLoads = activeTab === 'my' ? myLoads : allLoads
  const filteredLoads = getFilteredAndSortedLoads(displayLoads)

  if (!driver) {
    return null
  }

  return (
    <div className="p-8">
      {/* Driver Info Card */}
      <div className="glass p-6 rounded-2xl mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {driver.firstName} {driver.lastName}
            </h2>
            <p className="text-gray-600">{driver.vehicleType} • {driver.vehiclePlate}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            {driver.status}
          </span>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-700">{allLoads.length}</p>
            <p className="text-xs text-gray-600">All Loads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-accent-700">{myLoads.length}</p>
            <p className="text-xs text-gray-600">My Loads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-700">
              {myLoads.filter(l => ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(l.status)).length}
            </p>
            <p className="text-xs text-gray-600">Active</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 ${
            activeTab === 'all'
              ? 'border-slate-600 text-slate-900'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          All Loads ({allLoads.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 ${
            activeTab === 'my'
              ? 'border-slate-600 text-slate-900'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          My Loads ({myLoads.length})
        </button>
      </div>

      {/* Filters and Sort */}
      <div className="glass p-4 rounded-xl mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by tracking, city, commodity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="new">New/Requested</option>
              <option value="quoted">Quoted / Accepted</option>
              <option value="scheduled">Scheduled / En Route</option>
              <option value="pickedUp">Picked Up</option>
              <option value="inTransit">In Transit</option>
              <option value="cancelled">Cancelled / Denied</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
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

      {/* Loads List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            {activeTab === 'my' ? 'My Accepted Loads' : 'All Available Loads'}
          </h3>
          <span className="text-sm text-gray-600">
            Showing {filteredLoads.length} of {displayLoads.length} loads
          </span>
        </div>

        {isLoading ? (
          <div className="glass p-8 rounded-2xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading loads...</p>
          </div>
        ) : filteredLoads.length === 0 ? (
          <div className="glass p-8 rounded-2xl text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-2">
              {searchQuery || filterBy !== 'all' ? 'No loads match your filters' : activeTab === 'my' ? 'No accepted loads yet' : 'No loads available'}
            </p>
            <p className="text-sm text-gray-500">
              {searchQuery || filterBy !== 'all' ? 'Try adjusting your search or filters' : 'New requests will appear here as they come in'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLoads.map((load) => {
              const canAccept = !load.driver?.id && 
                                load.status === 'REQUESTED' &&
                                activeTab === 'all'
              const isMyLoad = load.driver?.id === driver?.id

              return (
              <div key={load.id} className="glass p-5 rounded-2xl">
                <Link
                  href={`/driver/loads/${load.id}`}
                  className="block hover:bg-white/60 transition-base"
                >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-mono font-bold text-primary-700 text-lg">
                        {load.publicTrackingCode}
                      </p>
                      {load.driver?.id === driver.id && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          My Load
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{load.serviceType.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="text-right">
                    {load.quoteAmount && (
                      <p className="text-lg font-bold text-gray-900 mb-1">
                        ${load.quoteAmount.toLocaleString()}
                      </p>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${LOAD_STATUS_COLORS[load.status as keyof typeof LOAD_STATUS_COLORS]}`}>
                      {LOAD_STATUS_LABELS[load.status as keyof typeof LOAD_STATUS_LABELS]}
                    </span>
                  </div>
                </div>

                {/* Route */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{load.pickupFacility.name}</p>
                      <p className="text-sm text-gray-600 truncate">{load.pickupFacility.city}, {load.pickupFacility.state}</p>
                      {load.readyTime && (
                        <p className="text-xs text-gray-500 mt-1">Ready: {formatDateTime(load.readyTime)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pl-4">
                    <div className="w-0.5 h-6 bg-gray-300"></div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{load.dropoffFacility.name}</p>
                      <p className="text-sm text-gray-600 truncate">{load.dropoffFacility.city}, {load.dropoffFacility.state}</p>
                      {load.deliveryDeadline && (
                        <p className="text-xs text-gray-500 mt-1">Deadline: {formatDateTime(load.deliveryDeadline)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cargo Info */}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      {load.estimatedContainers || 'N/A'} containers
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                      </svg>
                      {load.temperatureRequirement}
                    </span>
                    {load.driver && load.driver.id !== driver.id && (
                      <span className="text-gray-500">
                        Driver: {load.driver.firstName} {load.driver.lastName}
                      </span>
                    )}
                  </div>
                  
                  {/* Enhanced Compliance Data for My Loads Tab */}
                  {isMyLoad && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      {/* Signatures */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500">Signatures:</span>
                        {load.pickupSignature ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                            Pickup ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">No Pickup</span>
                        )}
                        {load.deliverySignature ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                            Delivery ✓
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">No Delivery</span>
                        )}
                      </div>
                      
                      {/* Temperatures */}
                      {(load.pickupTemperature !== null && load.pickupTemperature !== undefined) || 
                       (load.deliveryTemperature !== null && load.deliveryTemperature !== undefined) ? (
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-500">Temps:</span>
                          {load.pickupTemperature !== null && load.pickupTemperature !== undefined && (
                            <span className="text-gray-700">
                              Pickup: <span className="font-medium">{load.pickupTemperature}°C</span>
                            </span>
                          )}
                          {load.deliveryTemperature !== null && load.deliveryTemperature !== undefined && (
                            <span className="text-gray-700">
                              Delivery: <span className="font-medium">{load.deliveryTemperature}°C</span>
                            </span>
                          )}
                        </div>
                      ) : null}
                      
                      {/* Documents & Events Count */}
                      {(load.documents && load.documents.length > 0) || (load.trackingEvents && load.trackingEvents.length > 0) ? (
                        <div className="flex items-center gap-3 text-xs">
                          {load.documents && load.documents.length > 0 && (
                            <Link
                              href={`/driver/loads/${load.id}#documents`}
                              className="text-slate-600 hover:text-slate-700 font-medium flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {load.documents.length} document{load.documents.length !== 1 ? 's' : ''}
                            </Link>
                          )}
                          {load.trackingEvents && load.trackingEvents.length > 0 && (
                            <span className="text-gray-500">
                              {load.trackingEvents.length} tracking event{load.trackingEvents.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      ) : null}
                      
                      {/* Timestamps */}
                      {(load.actualPickupTime || load.actualDeliveryTime) && (
                        <div className="text-xs text-gray-500">
                          {load.actualPickupTime && `Picked up: ${formatDateTime(load.actualPickupTime)}`}
                          {load.actualPickupTime && load.actualDeliveryTime && ' • '}
                          {load.actualDeliveryTime && `Delivered: ${formatDateTime(load.actualDeliveryTime)}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex justify-end mt-3">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                </Link>

                {/* Action Buttons */}
                {canAccept && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    <button
                      onClick={(e) => handleAcceptLoad(load.id, e)}
                      className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold hover:from-green-700 hover:to-green-800 transition-all"
                    >
                      Accept Load
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDenyLoadId(load.id)
                        setShowDenyModal(true)
                      }}
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all"
                    >
                      Deny Load
                    </button>
                  </div>
                )}
                
              </div>
            )})}
          </div>
        )}

        {/* Deny Load Modal */}
        {showDenyModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDenyModal(false)}>
            <div className="glass max-w-md w-full rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Deny Load</h3>
              <p className="text-sm text-gray-600 mb-4">Why are you declining this load?</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reason *
                  </label>
                  <select
                    value={denyReason}
                    onChange={(e) => setDenyReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60"
                  >
                    <option value="PRICE_TOO_LOW">Price Too Low</option>
                    <option value="ROUTE_NOT_FEASIBLE">Route Not Feasible</option>
                    <option value="TIMING_NOT_WORKABLE">Timing Not Workable</option>
                    <option value="TOO_FAR">Too Far / Distance Issue</option>
                    <option value="EQUIPMENT_REQUIRED">Equipment Required (Not Available)</option>
                    <option value="ALREADY_BOOKED">Already Booked / Schedule Conflict</option>
                    <option value="OTHER">Other Reason</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={denyNotes}
                    onChange={(e) => setDenyNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60"
                    placeholder="Provide more details..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDenyModal(false)
                    setDenyLoadId(null)
                    setDenyReason('OTHER')
                    setDenyNotes('')
                  }}
                  className="flex-1 px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDenyLoad}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Deny Load'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Quote Modal */}
        {showQuoteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQuoteModal(false)}>
            <div className="glass max-w-md w-full rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Submit Quote</h3>
              <p className="text-sm text-gray-600 mb-4">Provide your quote amount and any notes for the shipper.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quote Amount (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60"
                    placeholder="Add any terms, conditions, or notes for the shipper..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Quote expires in 48 hours if not approved.</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowQuoteModal(false)
                    setQuoteLoadId(null)
                    setQuoteAmount('')
                    setQuoteNotes('')
                  }}
                  className="flex-1 px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitQuote}
                  disabled={isSubmitting || !quoteAmount}
                  className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Quote'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
