'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { showToast } from '@/lib/toast'

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
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null)
  const [deletingFacilityId, setDeletingFacilityId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Get shipper from API auth check (httpOnly cookie) - layout handles redirects
    const fetchShipperData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'shipper') {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        setShipper(data.user)
        fetchFacilities(data.user.id)
      } catch (error) {
        console.error('Error fetching shipper data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchShipperData()
  }, [])

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

  const facilityTypeOptions = [
    { value: 'CLINIC', label: 'Clinic' },
    { value: 'LAB', label: 'Laboratory' },
    { value: 'HOSPITAL', label: 'Hospital' },
    { value: 'PHARMACY', label: 'Pharmacy' },
    { value: 'DIALYSIS', label: 'Dialysis Center' },
    { value: 'IMAGING', label: 'Imaging Center' },
    { value: 'GOVERNMENT', label: 'Government Facility' },
    { value: 'OTHER', label: 'Other' },
  ]

  const handleEditFacility = (facility: Facility, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setEditingFacility({ ...facility })
    setSelectedFacility(null)
  }

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFacility || !shipper) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/shippers/${shipper.id}/facilities`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: editingFacility.id,
          name: editingFacility.name,
          facilityType: editingFacility.facilityType,
          addressLine1: editingFacility.addressLine1,
          addressLine2: editingFacility.addressLine2,
          city: editingFacility.city,
          state: editingFacility.state,
          postalCode: editingFacility.postalCode,
          contactName: editingFacility.contactName,
          contactPhone: editingFacility.contactPhone,
          defaultAccessNotes: editingFacility.defaultAccessNotes,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Update local state
        setFacilities((prev) =>
          prev.map((f) => (f.id === editingFacility.id ? { ...editingFacility } : f))
        )
        setEditingFacility(null)
        showToast.success('Facility updated successfully')
      } else {
        showToast.error(data.error || 'Failed to update facility')
      }
    } catch (error) {
      console.error('Error updating facility:', error)
      showToast.error('Failed to update facility')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteFacility = async (facilityId: string, facilityName: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent opening the modal when clicking delete

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${facilityName}"? This action cannot be undone.`)) {
      return
    }

    if (!shipper) return

    try {
      setDeletingFacilityId(facilityId)
      const response = await fetch(`/api/shippers/${shipper.id}/facilities?facilityId=${facilityId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        // Remove from local state
        setFacilities((prev) => prev.filter((f) => f.id !== facilityId))
        // Close modal if the deleted facility was selected
        if (selectedFacility?.id === facilityId) {
          setSelectedFacility(null)
        }
        showToast.success('Facility deleted successfully')
      } else {
        // Show error message from API
        showToast.error(data.message || data.error || 'Failed to delete facility')
      }
    } catch (error) {
      console.error('Error deleting facility:', error)
      showToast.error('Failed to delete facility')
    } finally {
      setDeletingFacilityId(null)
    }
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
      <div className="sticky top-[73px] z-[50] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pt-6 pb-4 mb-6 -mx-8 px-8 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 print:text-2xl">Saved Facilities</h1>
            <p className="text-slate-400 text-sm md:text-base print:text-sm">View and manage your frequently used pickup and delivery locations</p>
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
          <div className="flex items-center justify-center mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
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
          <div className="flex items-center justify-center mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No facilities match your filters</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedFacilities.map((facility) => (
            <div
              key={facility.id}
              onClick={() => setSelectedFacility(facility)}
              className="glass-primary rounded-xl p-6 hover:shadow-glass-lg transition-all border-2 border-blue-200/30 hover:border-blue-300/50 shadow-glass cursor-pointer relative"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900 flex-1">{facility.name}</h3>
                <div className="flex items-center gap-2 ml-2">
                  <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded border border-primary-200">
                    {getFacilityTypeLabel(facility.facilityType)}
                  </span>
                  <button
                    onClick={(e) => handleEditFacility(facility, e)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit facility"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDeleteFacility(facility.id, facility.name, e)}
                    disabled={deletingFacilityId === facility.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete facility"
                  >
                    {deletingFacilityId === facility.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
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

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (selectedFacility) {
                      handleEditFacility(selectedFacility, e)
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Facility
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (selectedFacility) {
                        handleDeleteFacility(selectedFacility.id, selectedFacility.name, e)
                        setSelectedFacility(null)
                      }
                    }}
                    disabled={deletingFacilityId === selectedFacility?.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {deletingFacilityId === selectedFacility?.id ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </>
                    )}
                  </button>
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
        </div>
      )}

      {/* Edit Facility Modal */}
      {editingFacility && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingFacility(null)}>
          <div className="glass-primary max-w-2xl w-full rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Edit Facility</h2>
              <button
                onClick={() => setEditingFacility(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveFacility} className="space-y-4">
              {/* Facility Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={editingFacility.name}
                  onChange={(e) => setEditingFacility({ ...editingFacility, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
                />
              </div>

              {/* Facility Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facility Type *</label>
                <select
                  required
                  value={editingFacility.facilityType}
                  onChange={(e) => setEditingFacility({ ...editingFacility, facilityType: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
                >
                  {facilityTypeOptions.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Address Line 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  value={editingFacility.addressLine1}
                  onChange={(e) => setEditingFacility({ ...editingFacility, addressLine1: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={editingFacility.addressLine2 || ''}
                  onChange={(e) => setEditingFacility({ ...editingFacility, addressLine2: e.target.value || null })}
                  className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
                />
              </div>

              {/* City, State, Postal Code */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={editingFacility.city}
                    onChange={(e) => setEditingFacility({ ...editingFacility, city: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={editingFacility.state}
                    onChange={(e) => setEditingFacility({ ...editingFacility, state: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={editingFacility.postalCode}
                    onChange={(e) => setEditingFacility({ ...editingFacility, postalCode: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
                  />
                </div>
              </div>

              {/* Contact Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={editingFacility.contactName}
                  onChange={(e) => setEditingFacility({ ...editingFacility, contactName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={editingFacility.contactPhone}
                  onChange={(e) => setEditingFacility({ ...editingFacility, contactPhone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
                />
              </div>

              {/* Access Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Access Notes</label>
                <textarea
                  value={editingFacility.defaultAccessNotes || ''}
                  onChange={(e) => setEditingFacility({ ...editingFacility, defaultAccessNotes: e.target.value || null })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
                  placeholder="Enter default access instructions for this facility..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingFacility(null)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
