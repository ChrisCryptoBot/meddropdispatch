'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDateTime, formatDate } from '@/lib/utils'
import { LOAD_STATUS_COLORS, LOAD_STATUS_LABELS } from '@/lib/types'

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
  createdAt: string
}

type SortOption = 'newest' | 'oldest' | 'readyTime' | 'deadline' | 'status' | 'amount'
type FilterOption = 'all' | 'new' | 'quoted' | 'scheduled' | 'pickedUp' | 'inTransit'

export default function DriverDashboardPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [allLoads, setAllLoads] = useState<Load[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')

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
        new: ['NEW'],
        quoted: ['QUOTED', 'QUOTE_ACCEPTED'],
        scheduled: ['SCHEDULED'],
        pickedUp: ['PICKED_UP'],
        inTransit: ['IN_TRANSIT'],
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
          if (!a.readyTime) return 1
          if (!b.readyTime) return -1
          return new Date(a.readyTime).getTime() - new Date(b.readyTime).getTime()
        case 'deadline':
          if (!a.deliveryDeadline) return 1
          if (!b.deliveryDeadline) return -1
          return new Date(a.deliveryDeadline).getTime() - new Date(b.deliveryDeadline).getTime()
        case 'status':
          return a.status.localeCompare(b.status)
        case 'amount':
          return (b.quoteAmount || 0) - (a.quoteAmount || 0)
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
              <option value="new">New</option>
              <option value="quoted">Quoted / Accepted</option>
              <option value="scheduled">Scheduled</option>
              <option value="pickedUp">Picked Up</option>
              <option value="inTransit">In Transit</option>
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
              <option value="status">Status</option>
              <option value="amount">Amount (Highest)</option>
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
            {filteredLoads.map((load) => (
              <Link
                key={load.id}
                href={`/driver/loads/${load.id}`}
                className="block glass p-5 rounded-2xl hover:bg-white/60 transition-base"
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
                  <div className="flex items-center gap-4 text-xs text-gray-600">
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
                </div>

                {/* Arrow */}
                <div className="flex justify-end mt-3">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
