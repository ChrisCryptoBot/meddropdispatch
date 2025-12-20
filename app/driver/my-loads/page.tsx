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
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsedDriver = JSON.parse(driverData)
    setDriver(parsedDriver)
    fetchLoads(parsedDriver.id)
  }, [router])

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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your loads...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      <div className="sticky top-0 z-30 bg-gradient-medical-bg backdrop-blur-sm pt-[73px] pb-4 mb-8 print:mb-4 print:static print:pt-8 print:top-0 border-b border-teal-200/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">My Loads</h1>
            <p className="text-gray-600 print:text-sm">View all loads you've accepted with complete documentation and records</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="glass-accent rounded-xl p-4 border-2 border-teal-200/30 shadow-medical">
          <div className="text-2xl font-bold text-gray-900">{loads.length}</div>
          <div className="text-xs text-gray-600">Total Loads</div>
        </div>
        <div className="glass-accent rounded-xl p-4 border-2 border-teal-200/30 shadow-medical">
          <div className="text-2xl font-bold text-blue-600">
            {loads.filter(l => ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(l.status)).length}
          </div>
          <div className="text-xs text-gray-600">Active</div>
        </div>
        <div className="glass-accent rounded-xl p-4 border-2 border-teal-200/30 shadow-medical">
          <div className="text-2xl font-bold text-green-600">
            {loads.filter(l => l.status === 'DELIVERED').length}
          </div>
          <div className="text-xs text-gray-600">Completed</div>
        </div>
        <div className="glass-accent rounded-xl p-4 border-2 border-teal-200/30 shadow-medical">
          <div className="text-2xl font-bold text-accent-700">
            {loads.reduce((sum, l) => sum + l.documents.length, 0)}
          </div>
          <div className="text-xs text-gray-600">Documents</div>
        </div>
        <div className="glass-accent rounded-xl p-4 border-2 border-teal-200/30 shadow-medical">
          <div className="text-2xl font-bold text-green-700">
            ${loads.reduce((sum, l) => sum + (l.quoteAmount || 0), 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Total Earned</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass-accent p-4 rounded-xl mb-6 border-2 border-teal-200/30 shadow-medical">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by tracking code, commodity, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-teal-50/60"
            />
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-teal-50/60"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-teal-50/60"
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
        <div className="glass-accent rounded-2xl p-12 text-center border-2 border-teal-200/30 shadow-medical">
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
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No loads found</h3>
          <p className="text-gray-600">
            {searchQuery || filterBy !== 'all'
              ? 'No loads match your search or filters'
              : 'You haven\'t accepted any loads yet. Check the Load Board to accept loads.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedLoads.map((load) => (
            <div key={load.id} className="glass-accent rounded-xl p-6 border-2 border-teal-200/30 shadow-medical">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg font-mono">{load.publicTrackingCode}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        LOAD_STATUS_COLORS[load.status as keyof typeof LOAD_STATUS_COLORS] ||
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}
                    >
                      {LOAD_STATUS_LABELS[load.status as keyof typeof LOAD_STATUS_LABELS] || load.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    {load.shipper.companyName} • {load.commodityDescription}
                  </p>
                  <p className="text-xs text-gray-500">
                    Created: {formatDate(load.createdAt)}
                    {load.actualPickupTime && ` • Picked up: ${formatDateTime(load.actualPickupTime)}`}
                    {load.actualDeliveryTime && ` • Delivered: ${formatDateTime(load.actualDeliveryTime)}`}
                  </p>
                </div>
                <div className="text-right">
                  {load.quoteAmount && (
                    <p className="text-lg font-bold text-gray-900 mb-1">
                      ${load.quoteAmount.toLocaleString()}
                    </p>
                  )}
                  <div className="flex items-center gap-3 justify-end">
                    <Link
                      href={`/driver/loads/${load.id}`}
                      className="text-sm text-accent-700 hover:text-accent-800 font-medium"
                    >
                      View Details →
                    </Link>
                    {(load.status === 'SCHEDULED' || load.status === 'CANCELLED' || load.status === 'DELIVERED') && (
                      <button
                        onClick={() => handleDeleteLoad(load.id)}
                        className="p-2 text-urgent-600 hover:bg-urgent-50 rounded-lg transition-colors"
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
                  <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{load.pickupFacility.name}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {load.pickupFacility.addressLine1}, {load.pickupFacility.city}, {load.pickupFacility.state}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-urgent-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-urgent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{load.dropoffFacility.name}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {load.dropoffFacility.addressLine1}, {load.dropoffFacility.city}, {load.dropoffFacility.state}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance Data */}
              <div className="grid md:grid-cols-3 gap-4 mb-4 pt-4 border-t border-gray-200">
                {/* Signatures */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Signatures</p>
                  <div className="flex gap-2">
                    {load.pickupSignature ? (
                      <span className="px-2 py-1 bg-success-100 text-success-700 rounded text-xs font-medium border border-success-200">
                        Pickup ✓
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">No Pickup</span>
                    )}
                    {load.deliverySignature ? (
                      <span className="px-2 py-1 bg-success-100 text-success-700 rounded text-xs font-medium border border-success-200">
                        Delivery ✓
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">No Delivery</span>
                    )}
                  </div>
                </div>

                {/* Temperatures */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Temperatures</p>
                  <div className="flex gap-2 text-sm">
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
                    {!load.pickupTemperature && !load.deliveryTemperature && (
                      <span className="text-gray-500 text-xs">No temps recorded</span>
                    )}
                  </div>
                </div>

                {/* Tracking Events */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tracking Events</p>
                  <p className="text-sm text-gray-700 font-medium">{load.trackingEvents.length} events</p>
                </div>
              </div>

              {/* Documents */}
              {load.documents.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Documents & Proof ({load.documents.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {load.documents.map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/driver/loads/${load.id}#documents`}
                        className="px-3 py-1 bg-accent-100 text-accent-700 rounded-lg text-xs font-medium hover:bg-accent-200 transition-colors flex items-center gap-1 border border-accent-200"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

