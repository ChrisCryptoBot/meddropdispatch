'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatDateTime, formatDate } from '@/lib/utils'
import { LOAD_STATUS_COLORS, LOAD_STATUS_LABELS } from '@/lib/constants'
import RateCalculator from '@/components/features/RateCalculator'
import { showToast, showApiError } from '@/lib/toast'
import { getAllRouteUrls } from '@/lib/gps-routes'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyStates } from '@/components/ui/EmptyState'

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
type FilterOption = 'all' | 'new' | 'quoted' | 'scheduled' | 'pickedUp' | 'inTransit' | 'delivered' | 'cancelled'

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
  const [selectedLoads, setSelectedLoads] = useState<Set<string>>(new Set())
  const [showSmartRouteModal, setShowSmartRouteModal] = useState(false)
  const [smartRoute, setSmartRoute] = useState<any>(null)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [showVehicleSelectModal, setShowVehicleSelectModal] = useState(false)
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [enableLocationTracking, setEnableLocationTracking] = useState(false)

  useEffect(() => {
    // Check if driver is logged in
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsedDriver = JSON.parse(driverData)
    setDriver(parsedDriver)

    // Fetch all loads and vehicles
    fetchLoads(parsedDriver.id)
    fetchVehicles(parsedDriver.id)
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

  const handleDeleteLoad = async (loadId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this load? This will permanently delete the load and all associated documents. This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/load-requests/${loadId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete load')
      }

      // Remove from local state
      setAllLoads(prev => prev.filter(load => load.id !== loadId))
      
      // Show success message (you may need to import toast utility)
      alert('Load deleted successfully')
    } catch (error) {
      console.error('Error deleting load:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete load')
    }
  }

  const fetchVehicles = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/vehicles`)
      if (response.ok) {
        const data = await response.json()
        setVehicles(data.vehicles || [])
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error)
    }
  }

  const handleAcceptLoad = async (loadId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!driver) return

    // Check if driver has vehicles
    if (vehicles.length === 0) {
      showToast.warning('No vehicles available', 'Please add a vehicle in Vehicle Settings before accepting loads.')
      router.push('/driver/vehicle')
      return
    }

    // Reset location tracking toggle when opening modal
    setEnableLocationTracking(false)

    // Show vehicle selection modal
    setPendingLoadId(loadId)
    setSelectedVehicleId(vehicles[0]?.id || '')
    setShowVehicleSelectModal(true)
  }

  const handleConfirmAcceptLoad = async () => {
    if (!driver || !pendingLoadId || !selectedVehicleId) return

    if (!confirm('Accept this scheduling request? You should call the shipper first to confirm details and pricing before accepting.')) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/load-requests/${pendingLoadId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          driverId: driver.id,
          vehicleId: selectedVehicleId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept load')
      }

      // Refresh loads
      await fetchLoads(driver.id)
      setShowVehicleSelectModal(false)
      setPendingLoadId(null)
      setSelectedVehicleId('')
      setEnableLocationTracking(false)
      showToast.success('Load scheduled!', enableLocationTracking ? 'Location tracking is enabled. Shipper can see your location.' : 'Tracking is now active.')
    } catch (error) {
      showApiError(error, 'Failed to accept load')
    } finally {
      setIsSubmitting(false)
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
      showToast.success('Load denied', 'Load is now available for other drivers.')
    } catch (error) {
      showApiError(error, 'Failed to deny load')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitQuote = async () => {
    if (!driver || !quoteLoadId || !quoteAmount) {
      showToast.warning('Please enter a quote amount')
      return
    }

    const amount = parseFloat(quoteAmount)
    if (isNaN(amount) || amount <= 0) {
      showToast.warning('Please enter a valid quote amount')
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
      showToast.success('Quote submitted successfully!', 'Waiting for shipper approval.')
    } catch (error) {
      showApiError(error, 'Failed to submit quote')
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
        load.pickupFacility.name?.toLowerCase().includes(query) ||
        load.pickupFacility.city.toLowerCase().includes(query) ||
        load.pickupFacility.state.toLowerCase().includes(query) ||
        load.pickupFacility.addressLine1?.toLowerCase().includes(query) ||
        load.dropoffFacility.name?.toLowerCase().includes(query) ||
        load.dropoffFacility.city.toLowerCase().includes(query) ||
        load.dropoffFacility.state.toLowerCase().includes(query) ||
        load.dropoffFacility.addressLine1?.toLowerCase().includes(query) ||
        load.commodityDescription?.toLowerCase().includes(query) ||
        (load.serviceType || '').toLowerCase().includes(query) ||
        (load.driver && `${load.driver.firstName} ${load.driver.lastName}`.toLowerCase().includes(query))
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
        delivered: ['DELIVERED'],
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
    <div className="p-8 print:p-4">
      <div className="sticky top-0 z-30 bg-gradient-medical-bg backdrop-blur-sm pt-[73px] pb-4 mb-8 print:mb-4 print:static print:pt-8 print:top-0 border-b border-teal-200/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">Load Board</h1>
            <p className="text-gray-600 print:text-sm">View and accept available loads</p>
          </div>
        </div>
      </div>

      {/* Driver Info Card */}
      <div className="sticky top-[185px] z-20 glass-accent p-6 rounded-2xl mb-4 print:p-4 print:border print:border-gray-300 border-2 border-teal-200/30 shadow-medical print:static print:top-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {driver.firstName} {driver.lastName}
            </h2>
            <p className="text-teal-700">{driver.vehicleType} • {driver.vehiclePlate}</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-success-100 text-success-700 border-2 border-success-200">
            {driver.status}
          </span>
        </div>

        {/* Create Manual Load Button */}
        <div>
          <Link
            href="/driver/manual-load"
            className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-accent text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Manual Load
          </Link>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-accent rounded-2xl p-6 border-2 border-teal-200/30 shadow-medical">
          <div className="text-center">
            <p className="text-3xl font-bold text-gradient mb-1">{allLoads.length}</p>
            <p className="text-sm text-teal-700 font-medium">All Loads</p>
          </div>
        </div>
        <div className="glass-accent rounded-2xl p-6 border-2 border-teal-200/30 shadow-medical">
          <div className="text-center">
            <p className="text-3xl font-bold text-accent-700 mb-1">{myLoads.length}</p>
            <p className="text-sm text-teal-700 font-medium">My Loads</p>
          </div>
        </div>
        <div className="glass-accent rounded-2xl p-6 border-2 border-teal-200/30 shadow-medical">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 mb-1">
              {myLoads.filter(l => ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(l.status)).length}
            </p>
            <p className="text-sm text-teal-700 font-medium">Active</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-teal-200/30">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 ${
            activeTab === 'all'
              ? 'border-teal-600 text-teal-900'
              : 'border-transparent text-gray-600 hover:text-teal-700'
          }`}
        >
          All Loads ({allLoads.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 ${
            activeTab === 'my'
              ? 'border-teal-600 text-teal-900'
              : 'border-transparent text-gray-600 hover:text-teal-700'
          }`}
        >
          My Loads ({myLoads.length})
        </button>
      </div>

      {/* Filters and Sort */}
      <div className="glass-accent p-6 rounded-2xl mb-8 print:p-4 print:border print:border-gray-300 border-2 border-teal-200/30 shadow-medical">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by tracking, city, facility, commodity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 rounded-lg border border-teal-200 focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-teal-50/60"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-teal-50/60"
            >
              <option value="all">All Statuses</option>
              <option value="new">New/Requested</option>
              <option value="quoted">Quoted / Accepted</option>
              <option value="scheduled">Scheduled / En Route</option>
              <option value="pickedUp">Picked Up</option>
              <option value="inTransit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled / Denied</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-teal-50/60"
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
          <div className="flex items-center gap-4">
            {selectedLoads.size > 0 && (
              <button
                onClick={async () => {
                  setIsCalculatingRoute(true)
                  setShowSmartRouteModal(true)
                  try {
                    const response = await fetch('/api/route-optimization/optimize', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        loadIds: Array.from(selectedLoads),
                        driverId: driver?.id,
                      }),
                    })
                    const data = await response.json()
                    if (response.ok) {
                      setSmartRoute(data)
                    } else {
                      const errorMsg = data.message || data.error || 'Failed to optimize route'
                      toast.error(errorMsg)
                      console.error('Route optimization error:', data)
                    }
                  } catch (error) {
                    toast.error('Error calculating route')
                    console.error(error)
                  } finally {
                    setIsCalculatingRoute(false)
                  }
                }}
                className="px-6 py-3 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Smart Route ({selectedLoads.size} loads)
              </button>
            )}
            <span className="text-sm text-gray-600">
              Showing {filteredLoads.length} of {displayLoads.length} loads
            </span>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner portal="driver" label="Loading loads..." />
        ) : filteredLoads.length === 0 ? (
          <EmptyStates.NoLoads
            portal="driver"
            title={searchQuery || filterBy !== 'all' ? 'No loads match your filters' : activeTab === 'my' ? 'No accepted loads yet' : 'No loads available'}
            description={searchQuery || filterBy !== 'all' ? 'Try adjusting your search or filters' : 'New requests will appear here as they come in'}
          />
        ) : (
          <div className="space-y-4">
            {filteredLoads.map((load) => {
              const canAccept = !load.driver?.id && 
                                load.status === 'REQUESTED' &&
                                activeTab === 'all'
              const isMyLoad = load.driver?.id === driver?.id

              return (
              <div key={load.id} className="glass-accent p-5 rounded-2xl border-2 border-teal-200/30 hover:shadow-medical transition-all hover:border-teal-300/50">
                {/* Checkbox for Smart Route */}
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedLoads.has(load.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      const newSelected = new Set(selectedLoads)
                      if (e.target.checked) {
                        newSelected.add(load.id)
                      } else {
                        newSelected.delete(load.id)
                      }
                      setSelectedLoads(newSelected)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <Link
                    href={`/driver/loads/${load.id}`}
                    className="flex-1 block hover:bg-white/60 transition-base"
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
                    <p className="text-sm text-gray-600">{(load.serviceType || 'N/A').replace(/_/g, ' ')}</p>
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
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                router.push(`/driver/loads/${load.id}#documents`)
                              }}
                              className="text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {load.documents.length} document{load.documents.length !== 1 ? 's' : ''}
                            </button>
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

                {/* Actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const urls = getAllRouteUrls(
                        {
                          addressLine1: load.pickupFacility.addressLine1,
                          city: load.pickupFacility.city,
                          state: load.pickupFacility.state,
                          postalCode: '',
                          name: load.pickupFacility.name,
                        },
                        {
                          addressLine1: load.dropoffFacility.addressLine1,
                          city: load.dropoffFacility.city,
                          state: load.dropoffFacility.state,
                          postalCode: '',
                          name: load.dropoffFacility.name,
                        }
                      )
                      window.open(urls.google, '_blank', 'noopener,noreferrer')
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium transition-colors flex items-center gap-1"
                    title="Open route in Google Maps"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Maps
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">View Details</span>
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                  </Link>
                </div>

                {/* Rate Calculator & Actions */}
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                  {/* Rate Calculator - Always visible for drivers */}
                  <div className="p-3 bg-teal-50 rounded-lg border border-teal-200/30">
                    <RateCalculator
                      loadId={load.id}
                      pickupAddress={`${load.pickupFacility.addressLine1}, ${load.pickupFacility.city}, ${load.pickupFacility.state}`}
                      dropoffAddress={`${load.dropoffFacility.addressLine1}, ${load.dropoffFacility.city}, ${load.dropoffFacility.state}`}
                      serviceType={load.serviceType}
                      showDeadhead={true}
                      className="text-sm"
                    />
                  </div>

                  {/* Action Buttons */}
                  {canAccept && (
                    <div className="space-y-2">
                      <button
                        onClick={(e) => handleAcceptLoad(load.id, e)}
                        className="w-full px-4 py-3 rounded-lg bg-gradient-success text-white font-semibold hover:shadow-lg transition-all shadow-lg"
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
                        className="w-full px-4 py-3 rounded-lg bg-teal-100 text-teal-700 font-semibold hover:bg-teal-200 transition-all"
                      >
                        Deny Load
                      </button>
                    </div>
                  )}

                  {/* Delete Button - For scheduled, completed, cancelled, or delivered loads */}
                  {(load.status === 'SCHEDULED' || load.status === 'CANCELLED' || load.status === 'DELIVERED') && (
                    <button
                      onClick={(e) => handleDeleteLoad(load.id, e)}
                      className="w-full px-4 py-3 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Load
                    </button>
                  )}
                </div>
                
              </div>
            )})}
          </div>
        )}

        {/* Deny Load Modal */}
        {showDenyModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDenyModal(false)}>
            <div className="glass-accent max-w-md w-full rounded-2xl p-6 border-2 border-teal-200/30 shadow-medical" onClick={(e) => e.stopPropagation()}>
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
                    className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-400 bg-white/80"
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
                    className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-400 bg-white/80"
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
                  className="flex-1 px-4 py-3 rounded-lg bg-teal-100 text-teal-700 font-semibold hover:bg-teal-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDenyLoad}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-urgent text-white font-semibold hover:shadow-lg disabled:opacity-50 transition-all shadow-lg"
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
            <div className="glass-accent max-w-md w-full rounded-2xl p-6 border-2 border-teal-200/30 shadow-medical" onClick={(e) => e.stopPropagation()}>
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
                      className="w-full pl-8 pr-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-400 bg-white/80"
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
                    className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-400 bg-white/80"
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

        {/* Smart Route Modal */}
        {showSmartRouteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSmartRouteModal(false)}>
            <div className="glass-accent max-w-4xl w-full rounded-2xl p-6 max-h-[90vh] overflow-y-auto border-2 border-teal-200/30 shadow-medical" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Smart Route Optimization</h3>
                <button
                  onClick={() => {
                    setShowSmartRouteModal(false)
                    setSmartRoute(null)
                    setSelectedLoads(new Set())
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {isCalculatingRoute ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Calculating optimal route...</p>
                </div>
              ) : smartRoute ? (
                <div className="space-y-4">
                  {/* Route Summary Stats */}
                  <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-6 mb-4 border-2 border-teal-200/30">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="glass-accent p-3 rounded-lg border border-teal-200/30">
                        <p className="text-2xl font-bold text-gradient">{smartRoute.totalDistance?.toFixed(1) || 'N/A'}</p>
                        <p className="text-xs text-teal-700 mt-1">Total Miles</p>
                      </div>
                      <div className="glass-accent p-3 rounded-lg border border-teal-200/30">
                        <p className="text-2xl font-bold text-gradient">{smartRoute.totalTime || 'N/A'}</p>
                        <p className="text-xs text-teal-700 mt-1">Total Time</p>
                      </div>
                      <div className="glass-accent p-3 rounded-lg border border-teal-200/30">
                        <p className="text-2xl font-bold text-gradient">{smartRoute.optimizedRoute?.length || 0}</p>
                        <p className="text-xs text-teal-700 mt-1">Total Stops</p>
                      </div>
                      <div className="glass-accent p-3 rounded-lg border border-teal-200/30">
                        <p className="text-2xl font-bold text-gradient">{smartRoute.loadCount || 0}</p>
                        <p className="text-xs text-teal-700 mt-1">Loads</p>
                      </div>
                    </div>
                    {/* Estimated Fuel Cost */}
                    <div className="mt-4 pt-4 border-t border-teal-200/30">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Estimated Fuel Cost (at $3.50/gal, 20 mpg):</span>
                        <span className="font-semibold text-gray-900">
                          ${((smartRoute.totalDistance || 0) / 20 * 3.5).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 text-lg">Optimized Route:</h4>
                      <button
                        onClick={() => {
                          // Copy route to clipboard
                          const routeText = smartRoute.optimizedRoute?.map((stop: any, idx: number) => 
                            `${idx + 1}. ${stop.type === 'pickup' ? 'Pickup' : 'Delivery'} - ${stop.facilityName}\n   ${stop.address}\n   ${stop.loadCode || ''}`
                          ).join('\n\n') || ''
                          navigator.clipboard.writeText(routeText)
                          toast.success('Route copied to clipboard!')
                        }}
                        className="px-3 py-2 text-sm bg-teal-100 hover:bg-teal-200 rounded-lg transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Route
                      </button>
                    </div>
                    {smartRoute.optimizedRoute?.map((stop: any, index: number) => (
                      <div key={index} className="glass-accent p-4 rounded-lg border-l-4 border-teal-300 hover:border-teal-500 transition-all">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 ${stop.type === 'pickup' ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center font-bold flex-shrink-0 shadow-lg`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                stop.type === 'pickup' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {stop.type === 'pickup' ? '📍 PICKUP' : '🎯 DELIVERY'}
                              </span>
                              {stop.loadCode && (
                                <span className="text-xs font-mono text-teal-600 font-semibold bg-teal-50 px-2 py-1 rounded border border-teal-200">
                                  {stop.loadCode}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 text-base">{stop.facilityName}</p>
                            <p className="text-sm text-gray-700 mt-1">{stop.address}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs">
                              {stop.timeWindow && (
                                <span className="flex items-center gap-1 text-gray-600">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {stop.timeWindow}
                                </span>
                              )}
                              {stop.distanceFromPrevious && (
                                <span className="flex items-center gap-1 text-gray-600">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                  </svg>
                                  {stop.distanceFromPrevious} mi
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No route data available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vehicle Selection Modal */}
        {showVehicleSelectModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => {
            setShowVehicleSelectModal(false)
            setPendingLoadId(null)
            setSelectedVehicleId('')
          }}>
            <div className="glass-accent max-w-md w-full rounded-2xl p-6 border-2 border-teal-200/30 shadow-medical" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Select Vehicle</h3>
              <p className="text-sm text-gray-600 mb-4">Choose which vehicle you'll use for this load.</p>
              
              <div className="space-y-3 mb-6">
                {vehicles.filter(v => v.isActive).map((vehicle) => (
                  <label
                    key={vehicle.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedVehicleId === vehicle.id
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-teal-200 hover:border-teal-300 bg-white/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vehicle"
                      value={vehicle.id}
                      checked={selectedVehicleId === vehicle.id}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="mt-1 w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">
                          {vehicle.nickname || `${(vehicle.vehicleType || 'N/A').replace(/_/g, ' ')}`}
                        </p>
                        {vehicle.hasRefrigeration && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                            Refrigerated
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {vehicle.vehicleYear && vehicle.vehicleMake && vehicle.vehicleModel
                          ? `${vehicle.vehicleYear} ${vehicle.vehicleMake} ${vehicle.vehicleModel}`
                          : (vehicle.vehicleType || 'N/A').replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Plate: {vehicle.vehiclePlate}</p>
                    </div>
                  </label>
                ))}
              </div>

              {vehicles.filter(v => v.isActive).length === 0 && (
                <div className="text-center py-8 mb-6">
                  <p className="text-gray-600 mb-4">No active vehicles available</p>
                  <button
                    onClick={() => {
                      setShowVehicleSelectModal(false)
                      router.push('/driver/vehicle')
                    }}
                    className="px-4 py-2 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-lg"
                  >
                    Add Vehicle
                  </button>
                </div>
              )}

              {/* Location Tracking Toggle */}
              {vehicles.filter(v => v.isActive).length > 0 && (
                <div className="mb-6 p-4 bg-teal-50 border-2 border-teal-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <label htmlFor="enableLocationTracking" className="text-sm font-semibold text-gray-900 cursor-pointer">
                          Track My Location
                        </label>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Allow shipper to see your real-time location during this delivery
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableLocationTracking(!enableLocationTracking)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                        enableLocationTracking ? 'bg-teal-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={enableLocationTracking}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          enableLocationTracking ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowVehicleSelectModal(false)
                    setPendingLoadId(null)
                    setSelectedVehicleId('')
                    setEnableLocationTracking(false)
                  }}
                  className="flex-1 px-4 py-3 rounded-lg bg-teal-100 text-teal-700 font-semibold hover:bg-teal-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAcceptLoad}
                  disabled={isSubmitting || !selectedVehicleId || vehicles.filter(v => v.isActive).length === 0}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-success text-white font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {isSubmitting ? 'Accepting...' : 'Accept Load'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
