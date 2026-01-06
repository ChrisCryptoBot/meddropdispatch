'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { showToast, showApiError } from '@/lib/toast'

interface Shipper {
  id: string
  companyName: string
  clientType: string
  contactName: string
  phone: string
  email: string
  isActive: boolean
  createdAt: string
  stats: {
    totalLoads: number
    completedLoads: number
    pendingLoads: number
    totalRevenue: number
    averageRevenuePerLoad: number
    lastLoadDate: string | null
  }
}

type SortField = 
  | 'company_asc' 
  | 'company_desc' 
  | 'total_loads' 
  | 'completed_loads' 
  | 'revenue_high' 
  | 'revenue_low'
  | 'recent_activity'
  | 'oldest_activity'
  | 'client_type'

type FilterOption = 'all' | 'active' | 'inactive' | 'with_loads' | 'no_loads'

export default function DriverShippersPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [shippers, setShippers] = useState<Shipper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('recent_activity')
  const [selectedClientType, setSelectedClientType] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
        fetchShippers(data.user.id)
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  const fetchShippers = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/shippers`)
      if (!response.ok) throw new Error('Failed to fetch shippers')

      const data = await response.json()
      setShippers(data.shippers || [])
    } catch (error) {
      console.error('Error fetching shippers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (shipperId: string, companyName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${companyName}? This will hide them from active lists but preserve their data.`)) {
      return
    }

    setDeletingId(shipperId)
    try {
      const response = await fetch(`/api/shippers/${shipperId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete shipper')
      }

      showToast.success('Shipper deactivated successfully')
      if (driver) {
        await fetchShippers(driver.id) // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting shipper:', error)
      showApiError(error, 'Failed to delete shipper')
    } finally {
      setDeletingId(null)
    }
  }


  // Get unique client types for filter
  const clientTypes = useMemo(() => {
    const types = new Set(shippers.map((s) => s.clientType))
    return Array.from(types).sort()
  }, [shippers])

  // Filter and sort shippers
  const filteredAndSortedShippers = useMemo(() => {
    let filtered = shippers

    // Filter by status
    if (filter === 'active') {
      filtered = filtered.filter((s) => s.isActive)
    } else if (filter === 'inactive') {
      filtered = filtered.filter((s) => !s.isActive)
    } else if (filter === 'with_loads') {
      filtered = filtered.filter((s) => s.stats.totalLoads > 0)
    } else if (filter === 'no_loads') {
      filtered = filtered.filter((s) => s.stats.totalLoads === 0)
    }

    // Filter by client type
    if (selectedClientType !== 'all') {
      filtered = filtered.filter((s) => s.clientType === selectedClientType)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.companyName.toLowerCase().includes(query) ||
          s.contactName.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.phone.toLowerCase().includes(query) ||
          s.clientType.toLowerCase().includes(query)
      )
    }

    // Sort shippers
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'company_asc':
          return a.companyName.localeCompare(b.companyName)
        case 'company_desc':
          return b.companyName.localeCompare(a.companyName)
        case 'total_loads':
          return b.stats.totalLoads - a.stats.totalLoads
        case 'completed_loads':
          return b.stats.completedLoads - a.stats.completedLoads
        case 'revenue_high':
          return b.stats.totalRevenue - a.stats.totalRevenue
        case 'revenue_low':
          return a.stats.totalRevenue - b.stats.totalRevenue
        case 'recent_activity':
          if (!a.stats.lastLoadDate && !b.stats.lastLoadDate) return 0
          if (!a.stats.lastLoadDate) return 1
          if (!b.stats.lastLoadDate) return -1
          return new Date(b.stats.lastLoadDate).getTime() - new Date(a.stats.lastLoadDate).getTime()
        case 'oldest_activity':
          if (!a.stats.lastLoadDate && !b.stats.lastLoadDate) return 0
          if (!a.stats.lastLoadDate) return 1
          if (!b.stats.lastLoadDate) return -1
          return new Date(a.stats.lastLoadDate).getTime() - new Date(b.stats.lastLoadDate).getTime()
        case 'client_type':
          return a.clientType.localeCompare(b.clientType)
        default:
          return 0
      }
    })

    return sorted
  }, [shippers, filter, searchQuery, sortBy, selectedClientType])

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalShippers = shippers.length
    const activeShippers = shippers.filter((s) => s.isActive).length
    const totalLoads = shippers.reduce((sum, s) => sum + s.stats.totalLoads, 0)
    const completedLoads = shippers.reduce((sum, s) => sum + s.stats.completedLoads, 0)
    const totalRevenue = shippers.reduce((sum, s) => sum + s.stats.totalRevenue, 0)

    return {
      totalShippers,
      activeShippers,
      totalLoads,
      completedLoads,
      totalRevenue,
    }
  }, [shippers])

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
    <div className="p-8 print:p-4">
      <div className="sticky top-[73px] z-[50] bg-slate-900 pt-0 pb-4 mb-6 -mx-8 px-8 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 print:text-2xl">Shippers & Clients</h1>
            <p className="text-slate-400 text-sm md:text-base print:text-sm">View all shippers you've worked with and track your business relationships</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8 print:grid-cols-5 print:gap-2">
        <div className="glass-accent rounded-xl p-6 print:p-4 print:border print:border-gray-300 border-2 border-teal-200/30 shadow-medical">
          <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1 print:text-xl">{stats.totalShippers}</div>
          <div className="text-sm text-gray-600 print:text-xs">Total Shippers</div>
        </div>
        <div className="glass-accent rounded-xl p-6 print:p-4 print:border print:border-gray-300 border-2 border-teal-200/30 shadow-medical">
          <div className="text-2xl lg:text-3xl font-bold text-success-600 mb-1 print:text-xl">{stats.activeShippers}</div>
          <div className="text-sm text-gray-600 print:text-xs">Active</div>
        </div>
        <div className="glass-accent rounded-xl p-6 print:p-4 print:border print:border-gray-300 border-2 border-teal-200/30 shadow-medical">
          <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1 print:text-xl">{stats.totalLoads}</div>
          <div className="text-sm text-gray-600 print:text-xs">Total Loads</div>
        </div>
        <div className="glass-accent rounded-xl p-6 print:p-4 print:border print:border-gray-300 border-2 border-teal-200/30 shadow-medical">
          <div className="text-2xl lg:text-3xl font-bold text-primary-600 mb-1 print:text-xl">{stats.completedLoads}</div>
          <div className="text-sm text-gray-600 print:text-xs">Completed</div>
        </div>
        <div className="glass-accent rounded-xl p-6 print:p-4 print:border print:border-gray-300 border-2 border-teal-200/30 shadow-medical">
          <div className="text-2xl lg:text-3xl font-bold text-success-600 mb-1 print:text-xl">${stats.totalRevenue.toFixed(2)}</div>
          <div className="text-sm text-gray-600 print:text-xs">Total Revenue</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass-accent p-6 rounded-2xl mb-8 print:p-4 print:border print:border-gray-300 border-2 border-teal-200/30 shadow-medical">
        <div className="grid md:grid-cols-4 gap-4">
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
              placeholder="Search by company, contact, email, phone..."
              className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-teal-50/60"
            />
          </div>

          {/* Filter */}
          <div>
            <label htmlFor="filter" className="block text-sm font-semibold text-gray-700 mb-2">
              Filter
            </label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterOption)}
              className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-teal-50/60"
            >
              <option value="all">All Shippers</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="with_loads">With Loads</option>
              <option value="no_loads">No Loads</option>
            </select>
          </div>

          {/* Client Type Filter */}
          <div>
            <label htmlFor="clientType" className="block text-sm font-semibold text-gray-700 mb-2">
              Client Type
            </label>
            <select
              id="clientType"
              value={selectedClientType}
              onChange={(e) => setSelectedClientType(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-teal-50/60"
            >
              <option value="all">All Types</option>
              {clientTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
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
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-teal-50/60"
          >
            <option value="recent_activity">Recent Activity (Newest)</option>
            <option value="oldest_activity">Oldest Activity</option>
            <option value="company_asc">Company Name (A-Z)</option>
            <option value="company_desc">Company Name (Z-A)</option>
            <option value="total_loads">Total Loads (High to Low)</option>
            <option value="completed_loads">Completed Loads (High to Low)</option>
            <option value="revenue_high">Revenue (High to Low)</option>
            <option value="revenue_low">Revenue (Low to High)</option>
            <option value="client_type">Client Type</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredAndSortedShippers.length} of {shippers.length} shippers
        </p>
      </div>

      {/* Shippers List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading shippers...</p>
          </div>
        </div>
      ) : filteredAndSortedShippers.length === 0 ? (
        <div className="glass-accent p-12 rounded-2xl text-center border-2 border-teal-200/30 shadow-medical">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM9 10a3 3 0 100-6 3 3 0 000 6zm0 0v8a2 2 0 002 2h6a2 2 0 002-2v-8M9 10h6" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No shippers found</h3>
            <p className="text-gray-600">
              {searchQuery || filter !== 'all' || selectedClientType !== 'all'
                ? 'Try adjusting your filters or search query'
                : "You haven't worked with any shippers yet. Loads will appear here once you accept and complete jobs."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAndSortedShippers.map((shipper) => (
              <div
                key={shipper.id}
                className="glass-accent p-6 rounded-2xl hover:shadow-lg transition-all border-2 border-teal-200/30 shadow-medical"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left: Company Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {shipper.companyName}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {shipper.clientType.replace(/_/g, ' ')}
                        </p>
                      </div>
                      {!shipper.isActive && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-semibold">Contact:</span> {shipper.contactName}
                      </div>
                      <div>
                        <span className="font-semibold">Phone:</span>{' '}
                        <a href={`tel:${shipper.phone}`} className="text-accent-600 hover:text-accent-800">
                          {shipper.phone}
                        </a>
                      </div>
                      <div>
                        <span className="font-semibold">Email:</span>{' '}
                        <a href={`mailto:${shipper.email}`} className="text-accent-600 hover:text-accent-800">
                          {shipper.email}
                        </a>
                      </div>
                      {shipper.stats.lastLoadDate && (
                        <div>
                          <span className="font-semibold">Last Load:</span>{' '}
                          {formatDate(shipper.stats.lastLoadDate)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Stats */}
                  <div className="flex-shrink-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Total Loads</p>
                        <p className="text-lg font-bold text-gray-900">{shipper.stats.totalLoads}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Completed</p>
                        <p className="text-lg font-bold text-blue-700">{shipper.stats.completedLoads}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Pending</p>
                        <p className="text-lg font-bold text-amber-700">{shipper.stats.pendingLoads}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Revenue</p>
                        <p className="text-lg font-bold text-green-700">
                          ${shipper.stats.totalRevenue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {shipper.stats.completedLoads > 0 && (
                      <div className="mt-2 text-center">
                        <p className="text-xs text-gray-500">
                          Avg: ${shipper.stats.averageRevenuePerLoad.toFixed(2)}/load
                        </p>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/driver/shippers/${shipper.id}`}
                        className="flex-1 text-center px-4 py-2 bg-gradient-accent text-white rounded-lg hover:shadow-lg transition-all text-sm font-semibold"
                      >
                        View Profile
                      </Link>
                      <button
                        onClick={() => handleDelete(shipper.id, shipper.companyName)}
                        disabled={deletingId === shipper.id}
                        className="p-2 text-warning-600 hover:bg-warning-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Deactivate shipper (soft delete)"
                      >
                        {deletingId === shipper.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-warning-600"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

