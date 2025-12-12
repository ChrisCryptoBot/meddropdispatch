'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatCurrency, formatDateTime } from '@/lib/utils'

interface LoadEarning {
  id: string
  publicTrackingCode: string
  quoteAmount: number | null
  status: string
  actualDeliveryTime: string | null
  createdAt: string
  serviceType?: string
  shipper: {
    id: string
    companyName: string
  }
  pickupFacility: {
    city: string
    state: string
  }
  dropoffFacility: {
    city: string
    state: string
  }
}

export default function DriverEarningsPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [loads, setLoads] = useState<LoadEarning[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [shipperFilter, setShipperFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'report'>('list')
  const [groupBy, setGroupBy] = useState<'none' | 'day' | 'week' | 'month' | 'shipper'>('none')

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsed = JSON.parse(driverData)
    setDriver(parsed)
    fetchDriverLoads(parsed.id)
  }, [router])

  const fetchDriverLoads = async (driverId: string) => {
    try {
      // Use my-loads endpoint which includes DELIVERED loads (unlike /loads which excludes them)
      const response = await fetch(`/api/drivers/${driverId}/my-loads`)
      if (!response.ok) throw new Error('Failed to fetch loads')

      const data = await response.json()
      setLoads(data.loads || [])
    } catch (error) {
      console.error('Error fetching driver loads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique shippers for filter
  const uniqueShippers = useMemo(() => {
    const shippers = new Map<string, string>()
    loads.forEach(load => {
      if (load.shipper && !shippers.has(load.shipper.id)) {
        shippers.set(load.shipper.id, load.shipper.companyName)
      }
    })
    return Array.from(shippers.entries()).map(([id, name]) => ({ id, name }))
  }, [loads])

  // Calculate stats
  const completedLoads = useMemo(() => 
    loads.filter((load) => load.status === 'DELIVERED'),
    [loads]
  )
  
  const totalEarned = useMemo(() => 
    completedLoads.reduce((sum, load) => sum + (load.quoteAmount || 0), 0),
    [completedLoads]
  )
  
  // Filter by date range
  const now = new Date()
  const thisMonth = useMemo(() => completedLoads.filter((load) => {
    if (!load.actualDeliveryTime) return false
    const date = new Date(load.actualDeliveryTime)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }), [completedLoads, now])
  
  const thisMonthEarned = useMemo(() => 
    thisMonth.reduce((sum, load) => sum + (load.quoteAmount || 0), 0),
    [thisMonth]
  )

  const thisYear = useMemo(() => completedLoads.filter((load) => {
    if (!load.actualDeliveryTime) return false
    const date = new Date(load.actualDeliveryTime)
    return date.getFullYear() === now.getFullYear()
  }), [completedLoads, now])
  
  const thisYearEarned = useMemo(() => 
    thisYear.reduce((sum, load) => sum + (load.quoteAmount || 0), 0),
    [thisYear]
  )

  // Filter loads for display
  const filteredLoads = useMemo(() => {
    let filtered = loads.filter((load) => {
      // Status filter
      if (filter === 'all') return load.status === 'DELIVERED'
      if (filter === 'pending') return load.status !== 'DELIVERED'
      if (filter === 'completed') return load.status === 'DELIVERED'
      return true
    })

    // Shipper filter
    if (shipperFilter !== 'all') {
      filtered = filtered.filter(load => load.shipper.id === shipperFilter)
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(load => {
        const deliveryDate = load.actualDeliveryTime || load.createdAt
        if (!deliveryDate) return false
        const date = new Date(deliveryDate)
        const start = new Date(dateRange.start)
        const end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999) // Include entire end date
        return date >= start && date <= end
      })
    }

    return filtered
  }, [loads, filter, shipperFilter, dateRange])

  // Group loads by period or shipper
  const groupedLoads = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All': filteredLoads }
    }

    const groups: Record<string, LoadEarning[]> = {}

    filteredLoads.forEach(load => {
      let key = 'Unknown'
      const deliveryDate = load.actualDeliveryTime || load.createdAt
      
      if (groupBy === 'shipper') {
        key = load.shipper.companyName
      } else if (deliveryDate) {
        const date = new Date(deliveryDate)
        if (groupBy === 'day') {
          key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        } else if (groupBy === 'week') {
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          key = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        } else if (groupBy === 'month') {
          key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(load)
    })

    // Sort groups
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (groupBy === 'month' || groupBy === 'week' || groupBy === 'day') {
        return new Date(groups[b][0]?.actualDeliveryTime || groups[b][0]?.createdAt || 0).getTime() - 
               new Date(groups[a][0]?.actualDeliveryTime || groups[a][0]?.createdAt || 0).getTime()
      }
      return a.localeCompare(b)
    })

    const sortedGroups: Record<string, LoadEarning[]> = {}
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key]
    })

    return sortedGroups
  }, [filteredLoads, groupBy])

  // Calculate average earnings per load
  const avgEarningsPerLoad = useMemo(() => {
    const completed = filteredLoads.filter(l => l.status === 'DELIVERED' && l.quoteAmount)
    if (completed.length === 0) return 0
    const total = completed.reduce((sum, load) => sum + (load.quoteAmount || 0), 0)
    return total / completed.length
  }, [filteredLoads])

  const getStatusColor = (status: string) => {
    if (status === 'DELIVERED') return 'bg-green-100 text-green-700 border-green-300'
    if (status === 'IN_TRANSIT' || status === 'PICKED_UP') return 'bg-blue-100 text-blue-700 border-blue-300'
    return 'bg-gray-100 text-gray-700 border-gray-300'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'DELIVERED': 'Delivered',
      'IN_TRANSIT': 'In Transit',
      'PICKED_UP': 'Picked Up',
      'SCHEDULED': 'Scheduled',
    }
    return labels[status] || status
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Tracking Code', 'Client', 'Pickup', 'Delivery', 'Delivery Date', 'Amount', 'Status']
    const rows = filteredLoads.map(load => [
      load.publicTrackingCode,
      load.shipper.companyName,
      `${load.pickupFacility.city}, ${load.pickupFacility.state}`,
      `${load.dropoffFacility.city}, ${load.dropoffFacility.state}`,
      load.actualDeliveryTime ? formatDateTime(load.actualDeliveryTime) : 'N/A',
      load.quoteAmount ? formatCurrency(load.quoteAmount) : '$0.00',
      load.status,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `earnings-report-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print report
  const printReport = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading earnings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      <div className="mb-8 print:mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">Earnings Report</h1>
            <p className="text-gray-600 print:text-sm">Track your earnings and completed loads</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={printReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8 print:grid-cols-5 print:gap-2">
        <div className="glass rounded-xl p-6 print:p-4 print:border print:border-gray-300">
          <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1 print:text-xl">{formatCurrency(totalEarned)}</div>
          <div className="text-sm text-gray-600 print:text-xs">Total Earned</div>
          <div className="text-xs text-gray-500 mt-1 print:text-xs">{completedLoads.length} completed loads</div>
        </div>
        <div className="glass rounded-xl p-6 print:p-4 print:border print:border-gray-300">
          <div className="text-2xl lg:text-3xl font-bold text-blue-600 mb-1 print:text-xl">{formatCurrency(thisMonthEarned)}</div>
          <div className="text-sm text-gray-600 print:text-xs">This Month</div>
          <div className="text-xs text-gray-500 mt-1 print:text-xs">{thisMonth.length} loads</div>
        </div>
        <div className="glass rounded-xl p-6 print:p-4 print:border print:border-gray-300">
          <div className="text-2xl lg:text-3xl font-bold text-green-600 mb-1 print:text-xl">{formatCurrency(thisYearEarned)}</div>
          <div className="text-sm text-gray-600 print:text-xs">This Year</div>
          <div className="text-xs text-gray-500 mt-1 print:text-xs">{thisYear.length} loads</div>
        </div>
        <div className="glass rounded-xl p-6 print:p-4 print:border print:border-gray-300">
          <div className="text-2xl lg:text-3xl font-bold text-purple-600 mb-1 print:text-xl">{formatCurrency(avgEarningsPerLoad)}</div>
          <div className="text-sm text-gray-600 print:text-xs">Avg per Load</div>
          <div className="text-xs text-gray-500 mt-1 print:text-xs">Based on filtered</div>
        </div>
        <div className="glass rounded-xl p-6 print:p-4 print:border print:border-gray-300">
          <div className="text-2xl lg:text-3xl font-bold text-slate-600 mb-1 print:text-xl">{filteredLoads.filter(l => l.status === 'DELIVERED').length}</div>
          <div className="text-sm text-gray-600 print:text-xs">Filtered Loads</div>
          <div className="text-xs text-gray-500 mt-1 print:text-xs">Matching criteria</div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="glass rounded-xl p-6 mb-6 print:hidden">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
          {/* Shipper Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Client</label>
            <select
              value={shipperFilter}
              onChange={(e) => setShipperFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="all">All Clients</option>
              {uniqueShippers.map(shipper => (
                <option key={shipper.id} value={shipper.id}>{shipper.name}</option>
              ))}
            </select>
          </div>
          {/* Group By */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            >
              <option value="none">No Grouping</option>
              <option value="day">By Day</option>
              <option value="week">By Week</option>
              <option value="month">By Month</option>
              <option value="shipper">By Client</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
              const end = new Date().toISOString().split('T')[0]
              setDateRange({ start, end })
            }}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            This Month
          </button>
          <button
            onClick={() => {
              const start = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
              const end = new Date().toISOString().split('T')[0]
              setDateRange({ start, end })
            }}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            This Year
          </button>
          <button
            onClick={() => {
              const end = new Date().toISOString().split('T')[0]
              const start = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
              setDateRange({ start, end })
            }}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => {
              setDateRange({ start: '', end: '' })
              setShipperFilter('all')
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 font-medium ml-auto"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 print:hidden">
        {[
          { key: 'all', label: 'All Completed' },
          { key: 'completed', label: 'Completed' },
          { key: 'pending', label: 'Pending Payment' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              filter === key
                ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg'
                : 'glass text-gray-700 hover:bg-white/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grouped Summary */}
      {groupBy !== 'none' && Object.keys(groupedLoads).length > 0 && (
        <div className="glass rounded-xl p-6 mb-6 print:border print:border-gray-300">
          <h2 className="text-xl font-bold text-gray-900 mb-4 print:text-lg">Summary by {groupBy === 'shipper' ? 'Client' : groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</h2>
          <div className="space-y-4">
            {Object.entries(groupedLoads).map(([groupKey, groupLoads]) => {
              const groupTotal = groupLoads
                .filter(l => l.status === 'DELIVERED')
                .reduce((sum, load) => sum + (load.quoteAmount || 0), 0)
              const groupCount = groupLoads.filter(l => l.status === 'DELIVERED').length
              
              return (
                <div key={groupKey} className="border-b border-gray-200 pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{groupKey}</h3>
                      <p className="text-sm text-gray-600">{groupCount} loads</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{formatCurrency(groupTotal)}</div>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Earnings Breakdown */}
      {filteredLoads.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
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
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No earnings yet</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? 'Completed loads will appear here with earnings information'
              : 'No loads match this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedLoads).map(([groupKey, groupLoads]) => (
            <div key={groupKey}>
              {groupBy !== 'none' && (
                <div className="mb-4 print:mb-2">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 print:text-base">
                    {groupKey}
                    <span className="ml-2 text-sm font-normal text-gray-600">
                      ({groupLoads.filter(l => l.status === 'DELIVERED').length} loads, {formatCurrency(groupLoads.filter(l => l.status === 'DELIVERED').reduce((sum, load) => sum + (load.quoteAmount || 0), 0))})
                    </span>
                  </h3>
                </div>
              )}
              {groupLoads.map((load) => (
            <div key={load.id} className="glass rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/driver/loads/${load.id}`}
                      className="font-bold text-gray-900 text-lg hover:text-slate-600 transition-colors"
                    >
                      {load.publicTrackingCode}
                    </Link>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        getStatusColor(load.status)
                      }`}
                    >
                      {getStatusLabel(load.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Client: <span className="font-medium">{load.shipper.companyName}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    Route: {load.pickupFacility.city}, {load.pickupFacility.state} → {load.dropoffFacility.city}, {load.dropoffFacility.state}
                  </p>
                  {load.actualDeliveryTime && (
                    <p className="text-sm text-gray-500 mt-2">
                      Delivered: {formatDateTime(load.actualDeliveryTime)}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  {load.quoteAmount ? (
                    <>
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {formatCurrency(load.quoteAmount)}
                      </div>
                      <p className="text-xs text-gray-500">Earnings</p>
                    </>
                  ) : (
                    <div className="text-sm text-gray-400">No quote set</div>
                  )}
                </div>
              </div>
            </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300">
        <p className="text-xs text-gray-600">
          Generated on {new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })} | 
          Driver: {driver?.firstName} {driver?.lastName} ({driver?.email})
        </p>
      </div>
    </div>
  )
}
