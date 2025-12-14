'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface Facility {
  id: string
  name: string
  facilityType: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  postalCode: string
  contactName: string
  contactPhone: string
  defaultAccessNotes: string | null
  createdAt: string
  totalUsage: number
}

export default function SavedFacilitiesPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'usage' | 'date'>('name')
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null)

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    const parsed = JSON.parse(shipperData)
    setShipper(parsed)
    fetchFacilities(parsed.id)
  }, [router])

  const fetchFacilities = async (shipperId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/shippers/${shipperId}/facilities`)
      if (response.ok) {
        const data = await response.json()
        setFacilities(data.facilities || [])
      }
    } catch (error) {
      console.error('Error fetching facilities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort facilities
  const filteredAndSortedFacilities = useMemo(() => {
    let filtered = facilities

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (facility) =>
          facility.name.toLowerCase().includes(query) ||
          facility.addressLine1.toLowerCase().includes(query) ||
          facility.city.toLowerCase().includes(query) ||
          facility.state.toLowerCase().includes(query) ||
          facility.contactName.toLowerCase().includes(query) ||
          facility.contactPhone.includes(query)
      )
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter((facility) => facility.facilityType === filterType)
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'type':
          return a.facilityType.localeCompare(b.facilityType)
        case 'usage':
          return b.totalUsage - a.totalUsage
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

    return sorted
  }, [facilities, searchQuery, filterType, sortBy])

  // Get unique facility types for filter
  const facilityTypes = useMemo(() => {
    const types = new Set(facilities.map((f) => f.facilityType))
    return Array.from(types).sort()
  }, [facilities])

  const getFacilityTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading facilities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      <div className="sticky top-[73px] z-30 bg-gradient-medical-bg pt-8 pb-4 mb-8 print:mb-4 print:static print:top-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">Saved Facilities</h1>
            <p className="text-gray-600 print:text-sm">View and manage your frequently used pickup and delivery locations</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-primary rounded-xl p-4 border-2 border-blue-200/30 shadow-glass">
          <div className="text-2xl font-bold text-primary-700">{facilities.length}</div>
          <div className="text-xs text-gray-600">Total Facilities</div>
        </div>
        <div className="glass-primary rounded-xl p-4 border-2 border-blue-200/30 shadow-glass">
          <div className="text-2xl font-bold text-accent-700">
            {facilities.reduce((sum, f) => sum + f.totalUsage, 0)}
          </div>
          <div className="text-xs text-gray-600">Total Loads</div>
        </div>
        <div className="glass-primary rounded-xl p-4 border-2 border-blue-200/30 shadow-glass">
          <div className="text-2xl font-bold text-success-700">
            {facilityTypes.length}
          </div>
          <div className="text-xs text-gray-600">Facility Types</div>
        </div>
        <div className="glass-primary rounded-xl p-4 border-2 border-blue-200/30 shadow-glass">
          <div className="text-2xl font-bold text-warning-700">
            {filteredAndSortedFacilities.length}
          </div>
          <div className="text-xs text-gray-600">Showing</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass-primary p-4 rounded-xl mb-6 border-2 border-blue-200/30 shadow-glass">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by name, address, city, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
            />
          </div>

          {/* Filter by Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
            >
              <option value="all">All Types</option>
              {facilityTypes.map((type) => (
                <option key={type} value={type}>
                  {getFacilityTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
            >
              <option value="name">Name (A-Z)</option>
              <option value="type">Type</option>
              <option value="usage">Usage (Most Used)</option>
              <option value="date">Date Added (Newest)</option>
            </select>
          </div>
        </div>
      </div>

      {facilities.length === 0 ? (
        <div className="glass-primary rounded-2xl p-12 text-center border-2 border-blue-200/30 shadow-glass">
          <div className="text-gray-400 text-6xl mb-4">📍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No saved facilities yet</h3>
          <p className="text-gray-600 mb-6">
            Facilities are automatically saved when loads are created. They will appear here for quick reference.
          </p>
          <p className="text-sm text-gray-500">
            When you request a callback to book a load, you can reference these facilities to help our dispatch team.
          </p>
        </div>
      ) : filteredAndSortedFacilities.length === 0 ? (
        <div className="glass-primary rounded-2xl p-12 text-center border-2 border-blue-200/30 shadow-glass">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No facilities match your filters</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedFacilities.map((facility) => (
            <div
              key={facility.id}
              onClick={() => setSelectedFacility(facility)}
              className="glass-primary rounded-xl p-6 hover:shadow-glass-lg transition-all border-2 border-blue-200/30 hover:border-blue-300/50 shadow-glass cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900 flex-1">{facility.name}</h3>
                <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded border border-primary-200 ml-2">
                  {getFacilityTypeLabel(facility.facilityType)}
                </span>
              </div>

              {/* Address */}
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium">{facility.addressLine1}</p>
                    {facility.addressLine2 && <p>{facility.addressLine2}</p>}
                    <p>
                      {facility.city}, {facility.state} {facility.postalCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="border-t border-gray-200 pt-3 mb-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-600">
                      <span className="font-medium">Contact:</span> {facility.contactName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${facility.contactPhone}`} className="text-primary-600 hover:text-primary-700 font-medium">
                      {facility.contactPhone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Access Notes */}
              {facility.defaultAccessNotes && (
                <div className="border-t border-gray-200 pt-3 mb-3">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Access Notes:</p>
                  <p className="text-xs text-gray-600 italic">{facility.defaultAccessNotes}</p>
                </div>
              )}

              {/* Usage Stats and Details */}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-gray-600">
                      Used in <span className="font-semibold text-primary-700">{facility.totalUsage}</span> load{facility.totalUsage !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-gray-400">
                    Added {formatDate(facility.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Facility Detail Modal */}
      {selectedFacility && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedFacility(null)}>
          <div className="glass-primary max-w-2xl w-full rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedFacility.name}</h2>
              <button
                onClick={() => setSelectedFacility(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Facility Type */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Facility Type</label>
                <span className="px-3 py-1 text-sm font-medium bg-primary-100 text-primary-700 rounded border border-primary-200">
                  {getFacilityTypeLabel(selectedFacility.facilityType)}
                </span>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Address</label>
                <div className="space-y-1 text-gray-700">
                  <p className="font-medium">{selectedFacility.addressLine1}</p>
                  {selectedFacility.addressLine2 && <p>{selectedFacility.addressLine2}</p>}
                  <p>{selectedFacility.city}, {selectedFacility.state} {selectedFacility.postalCode}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Contact Information</label>
                <div className="space-y-2 text-gray-700">
                  <div>
                    <span className="font-medium">Name:</span> {selectedFacility.contactName}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span>{' '}
                    <a href={`tel:${selectedFacility.contactPhone}`} className="text-primary-600 hover:text-primary-700">
                      {selectedFacility.contactPhone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Access Notes */}
              {selectedFacility.defaultAccessNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Access Notes</label>
                  <p className="text-gray-700 italic bg-blue-50/60 p-3 rounded-lg border border-blue-200/30">
                    {selectedFacility.defaultAccessNotes}
                  </p>
                </div>
              )}

              {/* Usage Stats */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Total Usage</label>
                    <p className="text-lg font-bold text-primary-700">{selectedFacility.totalUsage} load{selectedFacility.totalUsage !== 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Date Added</label>
                    <p className="text-gray-700">{formatDate(selectedFacility.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="px-6 py-2 bg-gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
