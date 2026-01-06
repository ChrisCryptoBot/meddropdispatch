'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { LOAD_STATUS_LABELS, LOAD_STATUS_COLORS } from '@/lib/constants'

interface Load {
  id: string
  publicTrackingCode: string
  status: string
  serviceType: string
  commodityDescription: string
  quoteAmount: number | null
  readyTime: string | null
  deliveryDeadline: string | null
  actualPickupTime: string | null
  actualDeliveryTime: string | null
  createdAt: string
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
  shipper: {
    id: string
    companyName: string
    contactName: string
    phone: string
    email: string
  }
  documents: Array<{
    id: string
    type: string
    title: string
    createdAt: string
  }>
}

type SortOption = 'newest' | 'oldest' | 'status' | 'revenue_high' | 'revenue_low' | 'pickup_date' | 'delivery_date'
type FilterOption = 'all' | 'completed' | 'pending' | 'delivered' | 'cancelled'

export default function ShipperLoadsPage() {
  const router = useRouter()
  const params = useParams()
  const shipperId = params?.id as string

  const [driver, setDriver] = useState<any>(null)
  const [shipper, setShipper] = useState<any>(null)
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
        
        if (shipperId) {
          fetchShipperLoads(data.user.id, shipperId)
        }
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [shipperId])

  const fetchShipperLoads = async (driverId: string, shipperId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/shippers/${shipperId}/loads`)
      if (!response.ok) throw new Error('Failed to fetch loads')

      const data = await response.json()
      setShipper(data.shipper)
      setLoads(data.loads || [])
    } catch (error) {
      console.error('Error fetching shipper loads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort loads
  const filteredAndSortedLoads = useMemo(() => {
    let filtered = loads

    // Filter by status
    if (filterBy !== 'all') {
      if (filterBy === 'completed') {
        filtered = filtered.filter((load) => 
          load.status === 'DELIVERED'
        )
      } else if (filterBy === 'pending') {
        filtered = filtered.filter((load) => 
          !['DELIVERED', 'CANCELLED'].includes(load.status)
        )
      } else if (filterBy === 'delivered') {
        filtered = filtered.filter((load) => load.status === 'DELIVERED')
      } else if (filterBy === 'cancelled') {
        filtered = filtered.filter((load) => load.status === 'CANCELLED')
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (load) =>
          load.publicTrackingCode.toLowerCase().includes(query) ||
          load.commodityDescription.toLowerCase().includes(query) ||
          load.pickupFacility.name.toLowerCase().includes(query) ||
          load.dropoffFacility.name.toLowerCase().includes(query) ||
          load.pickupFacility.city.toLowerCase().includes(query) ||
          load.dropoffFacility.city.toLowerCase().includes(query)
      )
    }

    // Sort loads
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'status':
          return a.status.localeCompare(b.status)
        case 'revenue_high':
          return (b.quoteAmount || 0) - (a.quoteAmount || 0)
        case 'revenue_low':
          return (a.quoteAmount || 0) - (b.quoteAmount || 0)
        case 'pickup_date':
          const aPickup = a.readyTime || a.createdAt
          const bPickup = b.readyTime || b.createdAt
          return new Date(bPickup).getTime() - new Date(aPickup).getTime()
        case 'delivery_date':
          const aDelivery = a.deliveryDeadline || a.createdAt
          const bDelivery = b.deliveryDeadline || b.createdAt
          return new Date(bDelivery).getTime() - new Date(aDelivery).getTime()
        default:
          return 0
      }
    })

    return sorted
  }, [loads, filterBy, searchQuery, sortBy])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalLoads = loads.length
    const completedLoads = loads.filter((load) => 
      load.status === 'DELIVERED'
    ).length
    const totalRevenue = loads
      .filter((load) => load.status === 'DELIVERED')
      .reduce((sum, load) => sum + (load.quoteAmount || 0), 0)

    return {
      totalLoads,
      completedLoads,
      totalRevenue,
    }
  }, [loads])

  if (!driver) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="sticky top-[73px] z-[50] bg-slate-900 pt-0 pb-4 mb-6 -mx-8 px-8 border-b border-slate-700/50">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/driver/shippers"
              className="text-slate-300 hover:text-cyan-400 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 print:text-2xl">
                {shipper?.companyName || 'Shipper'} - Load History
              </h1>
              <p className="text-slate-400 text-sm md:text-base print:text-sm">
                All loads you've completed for this shipper
              </p>
            </div>
          </div>
        </div>

        {/* Shipper Info */}
        {shipper && (
          <div className="glass p-6 rounded-2xl mb-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Contact</p>
                <p className="font-semibold text-gray-900">{shipper.contactName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Phone</p>
                <a href={`tel:${shipper.phone}`} className="font-semibold text-slate-600 hover:text-slate-800">
                  {shipper.phone}
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Email</p>
                <a href={`mailto:${shipper.email}`} className="font-semibold text-slate-600 hover:text-slate-800">
                  {shipper.email}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass p-4 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Total Loads</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalLoads}</p>
          </div>
          <div className="glass p-4 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-bold text-blue-700">{stats.completedLoads}</p>
          </div>
          <div className="glass p-4 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-green-700">${stats.totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="glass p-6 rounded-2xl mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by tracking code, commodity, facility..."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
              />
            </div>

            {/* Filter */}
            <div>
              <label htmlFor="filter" className="block text-sm font-semibold text-gray-700 mb-2">
                Filter
              </label>
              <select
                id="filter"
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
              >
                <option value="all">All Loads</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Sort */}
          <div className="mt-4">
            <label htmlFor="sort" className="block text-sm font-semibold text-gray-700 mb-2">
              Sort By
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="status">Status</option>
              <option value="revenue_high">Revenue (High to Low)</option>
              <option value="revenue_low">Revenue (Low to High)</option>
              <option value="pickup_date">Pickup Date</option>
              <option value="delivery_date">Delivery Date</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing {filteredAndSortedLoads.length} of {loads.length} loads
          </p>
        </div>

        {/* Loads List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p className="text-slate-300">Loading loads...</p>
            </div>
          </div>
        ) : filteredAndSortedLoads.length === 0 ? (
          <div className="glass p-12 rounded-2xl text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No loads found</h3>
            <p className="text-gray-600">
              {searchQuery || filterBy !== 'all'
                ? 'Try adjusting your filters or search query'
                : "You haven't completed any loads for this shipper yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedLoads.map((load) => (
              <Link
                key={load.id}
                href={`/driver/loads/${load.id}`}
                className="block glass p-6 rounded-2xl hover:shadow-lg transition-all border border-white/30"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left: Load Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {load.publicTrackingCode}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {load.serviceType.replace(/_/g, ' ')} • {load.commodityDescription}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          LOAD_STATUS_COLORS[load.status as keyof typeof LOAD_STATUS_COLORS] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {LOAD_STATUS_LABELS[load.status as keyof typeof LOAD_STATUS_LABELS] || load.status}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div>
                        <span className="font-semibold">Pickup:</span> {load.pickupFacility.name},{' '}
                        {load.pickupFacility.city}, {load.pickupFacility.state}
                      </div>
                      <div>
                        <span className="font-semibold">Delivery:</span> {load.dropoffFacility.name},{' '}
                        {load.dropoffFacility.city}, {load.dropoffFacility.state}
                      </div>
                      {load.readyTime && (
                        <div>
                          <span className="font-semibold">Ready:</span> {formatDate(load.readyTime)}
                        </div>
                      )}
                      {load.actualDeliveryTime && (
                        <div>
                          <span className="font-semibold">Delivered:</span> {formatDate(load.actualDeliveryTime)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Stats */}
                  <div className="flex-shrink-0 text-right">
                    {load.quoteAmount && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-600 mb-1">Revenue</p>
                        <p className="text-2xl font-bold text-green-700">${load.quoteAmount.toFixed(2)}</p>
                      </div>
                    )}
                    {load.documents.length > 0 && (
                      <div className="text-xs text-gray-600">
                        {load.documents.length} document{load.documents.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      Created: {formatDate(load.createdAt)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

