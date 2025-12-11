'use client'

// Advanced Search Bar Component
// Provides search functionality with filters

import { useState } from 'react'

interface SearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void
  placeholder?: string
  showAdvanced?: boolean
}

export interface SearchFilters {
  status?: string[]
  serviceType?: string[]
  dateRange?: {
    start: string
    end: string
  }
  shipperId?: string
  driverId?: string
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search...',
  showAdvanced = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})

  const handleSearch = () => {
    onSearch(query, filters)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearFilters = () => {
    setFilters({})
    setQuery('')
    onSearch('', {})
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Search
        </button>
        {showAdvanced && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Filters
          </button>
        )}
        {(query || Object.keys(filters).length > 0) && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && showFilters && (
        <div className="glass p-4 rounded-lg space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                multiple
                value={filters.status || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value)
                  setFilters({ ...filters, status: selected })
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500"
              >
                <option value="REQUESTED">Requested</option>
                <option value="QUOTED">Quoted</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PICKED_UP">Picked Up</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="DELIVERED">Delivered</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, start: e.target.value } as any,
                    })
                  }
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500"
                />
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, end: e.target.value } as any,
                    })
                  }
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
              <select
                multiple
                value={filters.serviceType || []}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value)
                  setFilters({ ...filters, serviceType: selected })
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500"
              >
                <option value="SAME_DAY">Same Day</option>
                <option value="SCHEDULED_ROUTE">Scheduled Route</option>
                <option value="STAT">STAT</option>
                <option value="NEXT_DAY">Next Day</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

