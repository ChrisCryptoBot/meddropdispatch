'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateTime, formatDate } from '@/lib/utils'
import { LOAD_STATUS_COLORS, LOAD_STATUS_LABELS } from '@/lib/constants'

interface Load {
  id: string
  publicTrackingCode: string
  status: string
  serviceType: string
  commodityDescription: string
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
  }
  dropoffFacility: {
    name: string
    city: string
    state: string
    addressLine1: string
  }
  shipper: {
    companyName: string
    contactName: string
  }
  documents: Array<{
    id: string
    type: string
    title: string
    createdAt: string
    uploadedBy: string | null
  }>
  trackingEvents: Array<{
    id: string
    label: string
    createdAt: string
    locationText?: string
  }>
  createdAt: string
}

type SortOption = 'newest' | 'oldest' | 'deliveryDate' | 'status' | 'amount'
type FilterOption = 'all' | 'scheduled' | 'pickedUp' | 'inTransit' | 'delivered' | 'completed'

export default function DriverMyLoadsPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [loads, setLoads] = useState<Load[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Get driver from API auth check (httpOnly cookie) - layout handles redirects
    const fetchDriverData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'driver') {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        setDriver(data.user)
        fetchLoads(data.user.id)
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  const fetchLoads = async (driverId: string) => {
    try {
      const params = new URLSearchParams()
      if (filterBy !== 'all') {
        params.append('status', filterBy.toUpperCase())
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/drivers/${driverId}/my-loads?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch loads')
      const data = await response.json()
      setLoads(data.loads || [])
    } catch (error) {
      console.error('Error fetching loads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (driver) {
      fetchLoads(driver.id)
    }
  }, [filterBy, searchQuery, driver])

  const handleDeleteLoad = async (loadId: string) => {
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
      setLoads(prev => prev.filter(load => load.id !== loadId))
      
      alert('Load deleted successfully')
    } catch (error) {
      console.error('Error deleting load:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete load')
    }
  }

  // Sort loads
  const sortedLoads = [...loads].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'deliveryDate':
        const aDate = a.actualDeliveryTime ? new Date(a.actualDeliveryTime).getTime() : 0
        const bDate = b.actualDeliveryTime ? new Date(b.actualDeliveryTime).getTime() : 0
        return bDate - aDate
      case 'status':
        return a.status.localeCompare(b.status)
      case 'amount':
        return (b.quoteAmount || 0) - (a.quoteAmount || 0)
      default:
        return 0
    }
  })

  const getDocumentTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading your loads...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[100px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          My Loads
        </h1>
        <p className="text-slate-400">View all loads you've accepted with complete documentation and records</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{loads.length}</div>
          <div className="text-xs text-slate-400">Total Loads</div>
        </div>
        <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {loads.filter(l => ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(l.status)).length}
          </div>
          <div className="text-xs text-slate-400">Active</div>
        </div>
        <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
          <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            {loads.filter(l => l.status === 'DELIVERED').length}
          </div>
          <div className="text-xs text-slate-400">Completed</div>
        </div>
        <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {loads.reduce((sum, l) => sum + l.documents.length, 0)}
          </div>
          <div className="text-xs text-slate-400">Documents</div>
        </div>
        <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
          <div className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            ${loads.reduce((sum, l) => sum + (l.quoteAmount || 0), 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400">Total Earned</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass-primary p-6 rounded-xl mb-6 border border-slate-700/50 shadow-lg">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by tracking code, commodity, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Status</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="pickedUp">Picked Up</option>
              <option value="inTransit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="deliveryDate">Delivery Date</option>
              <option value="status">Status</option>
              <option value="amount">Amount (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loads List */}
      {sortedLoads.length === 0 ? (
        <div className="glass-primary rounded-xl p-12 text-center border border-slate-700/50 shadow-lg">
          <svg
            className="w-16 h-16 text-slate-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">No loads found</h3>
          <p className="text-slate-300">
            {searchQuery || filterBy !== 'all'
              ? 'No loads match your search or filters'
              : 'You haven\'t accepted any loads yet. Check the Load Board to accept loads.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedLoads.map((load) => (
            <div key={load.id} className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-white text-lg font-mono">{load.publicTrackingCode}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        LOAD_STATUS_COLORS[load.status as keyof typeof LOAD_STATUS_COLORS] ||
                        'bg-slate-700/50 text-slate-300 border-slate-600/50'
                      }`}
                    >
                      {LOAD_STATUS_LABELS[load.status as keyof typeof LOAD_STATUS_LABELS] || load.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mb-1">
                    {load.shipper.companyName} • {load.commodityDescription}
                  </p>
                  <p className="text-xs text-slate-400">
                    Created: {formatDate(load.createdAt)}
                    {load.actualPickupTime && ` • Picked up: ${formatDateTime(load.actualPickupTime)}`}
                    {load.actualDeliveryTime && ` • Delivered: ${formatDateTime(load.actualDeliveryTime)}`}
                  </p>
                </div>
                <div className="text-right">
                  {load.quoteAmount && (
                    <p className="text-lg font-bold text-white mb-1">
                      ${load.quoteAmount.toLocaleString()}
                    </p>
                  )}
                  <div className="flex items-center gap-3 justify-end">
                    <Link
                      href={`/driver/loads/${load.id}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      View Details →
                    </Link>
                    {(load.status === 'SCHEDULED' || load.status === 'CANCELLED' || load.status === 'DELIVERED') && (
                      <button
                        onClick={() => handleDeleteLoad(load.id)}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete this load"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Route */}
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-green-500/30">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{load.pickupFacility.name}</p>
                    <p className="text-sm text-slate-300 truncate">
                      {load.pickupFacility.addressLine1}, {load.pickupFacility.city}, {load.pickupFacility.state}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border border-red-500/30">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{load.dropoffFacility.name}</p>
                    <p className="text-sm text-slate-300 truncate">
                      {load.dropoffFacility.addressLine1}, {load.dropoffFacility.city}, {load.dropoffFacility.state}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance Data */}
              <div className="grid md:grid-cols-3 gap-4 mb-4 pt-4 border-t border-slate-700/50">
                {/* Signatures */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Signatures</p>
                  <div className="flex gap-2">
                    {load.pickupSignature ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-medium border border-green-500/30">
                        Pickup ✓
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-700/50 text-slate-400 rounded text-xs">No Pickup</span>
                    )}
                    {load.deliverySignature ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-medium border border-green-500/30">
                        Delivery ✓
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-700/50 text-slate-400 rounded text-xs">No Delivery</span>
                    )}
                  </div>
                </div>

                {/* Temperatures */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Temperatures</p>
                  <div className="flex gap-2 text-sm">
                    {load.pickupTemperature !== null && load.pickupTemperature !== undefined && (
                      <span className="text-slate-300">
                        Pickup: <span className="font-medium">{load.pickupTemperature}°C</span>
                      </span>
                    )}
                    {load.deliveryTemperature !== null && load.deliveryTemperature !== undefined && (
                      <span className="text-slate-300">
                        Delivery: <span className="font-medium">{load.deliveryTemperature}°C</span>
                      </span>
                    )}
                    {!load.pickupTemperature && !load.deliveryTemperature && (
                      <span className="text-slate-400 text-xs">No temps recorded</span>
                    )}
                  </div>
                </div>

                {/* Tracking Events */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Tracking Events</p>
                  <p className="text-sm text-slate-300 font-medium">{load.trackingEvents.length} events</p>
                </div>
              </div>

              {/* Documents */}
              {load.documents.length > 0 && (
                <div className="pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-2">Documents & Proof ({load.documents.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {load.documents.map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/driver/loads/${load.id}#documents`}
                        className="px-3 py-1 bg-cyan-900/30 text-cyan-300 rounded-lg text-xs font-medium hover:bg-cyan-900/40 transition-colors flex items-center gap-1 border border-cyan-700/50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {getDocumentTypeLabel(doc.type)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

