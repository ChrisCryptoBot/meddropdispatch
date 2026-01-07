'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatCurrency, formatDateTime } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'

interface LoadHistory {
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

export default function DriverHistoryPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [loads, setLoads] = useState<LoadHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [shipperFilter, setShipperFilter] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'none' | 'day' | 'week' | 'month' | 'shipper'>('none')

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
        fetchDriverLoads(data.user.id)
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  const fetchDriverLoads = async (driverId: string) => {
    try {
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
  
  const totalValue = useMemo(() => 
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
  
  const thisMonthValue = useMemo(() => 
    thisMonth.reduce((sum, load) => sum + (load.quoteAmount || 0), 0),
    [thisMonth]
  )

  const thisYear = useMemo(() => completedLoads.filter((load) => {
    if (!load.actualDeliveryTime) return false
    const date = new Date(load.actualDeliveryTime)
    return date.getFullYear() === now.getFullYear()
  }), [completedLoads, now])
  
  const thisYearValue = useMemo(() => 
    thisYear.reduce((sum, load) => sum + (load.quoteAmount || 0), 0),
    [thisYear]
  )

  // Filter loads for display
  const filteredLoads = useMemo(() => {
    let filtered = loads.filter((load) => {
      // Status filter
      if (filter === 'all') return load.status === 'DELIVERED'
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

    const groups: Record<string, LoadHistory[]> = {}

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

    const sortedGroups: Record<string, LoadHistory[]> = {}
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key]
    })

    return sortedGroups
  }, [filteredLoads, groupBy])

  // Calculate average value per load
  const avgValuePerLoad = useMemo(() => {
    const completed = filteredLoads.filter(l => l.status === 'DELIVERED' && l.quoteAmount)
    if (completed.length === 0) return 0
    const total = completed.reduce((sum, load) => sum + (load.quoteAmount || 0), 0)
    return total / completed.length
  }, [filteredLoads])

  const getStatusColor = (status: string) => {
    if (status === 'DELIVERED') return 'bg-green-500/20 text-green-300 border-green-500/50'
    if (status === 'IN_TRANSIT' || status === 'PICKED_UP') return 'bg-blue-500/20 text-blue-300 border-blue-500/50'
    return 'bg-slate-700/50 text-slate-300 border-slate-600/50'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'DELIVERED': 'Delivered',
      'IN_TRANSIT': 'In Transit',
      'PICKED_UP': 'Picked Up',
      'SCHEDULED': 'Scheduled',
      'CANCELLED': 'Cancelled',
    }
    return labels[status] || status
  }

  if (isLoading) {
    return <LoadingSpinner portal="driver" label="Loading history..." />
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Load History
        </h1>
        <p className="text-slate-400">View your completed and past loads</p>
      </div>

      {loads.length === 0 ? (
        <EmptyState
          portal="driver"
          title="No load history"
          description="Your completed loads will appear here"
        />
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-primary p-4 rounded-xl border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Total Completed</p>
              <p className="text-2xl font-bold text-white">{completedLoads.length}</p>
            </div>
            <div className="glass-primary p-4 rounded-xl border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Total Value</p>
              <p className="text-2xl font-bold text-cyan-400">{formatCurrency(totalValue)}</p>
            </div>
            <div className="glass-primary p-4 rounded-xl border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">This Month</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(thisMonthValue)}</p>
            </div>
            <div className="glass-primary p-4 rounded-xl border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">This Year</p>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(thisYearValue)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="glass-primary p-4 rounded-xl border border-slate-700/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                >
                  <option value="none">No Grouping</option>
                  <option value="shipper">By Shipper</option>
                  <option value="day">By Day</option>
                  <option value="week">By Week</option>
                  <option value="month">By Month</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Shipper</label>
                <select
                  value={shipperFilter}
                  onChange={(e) => setShipperFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                >
                  <option value="all">All Shippers</option>
                  {uniqueShippers.map(shipper => (
                    <option key={shipper.id} value={shipper.id}>{shipper.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-600/50 bg-slate-800/50 text-slate-200"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-600/50 bg-slate-800/50 text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Grouped Loads */}
          {Object.entries(groupedLoads).map(([groupKey, groupLoads]) => (
            <div key={groupKey} className="glass-primary rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="p-4 bg-slate-800/50 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-white">{groupKey}</h2>
                <p className="text-sm text-slate-400">{groupLoads.length} load{groupLoads.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="divide-y divide-slate-700/50">
                {groupLoads.map(load => (
                  <Link
                    key={load.id}
                    href={`/driver/loads/${load.id}`}
                    className="block p-4 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono font-bold text-cyan-400">{load.publicTrackingCode}</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(load.status)}`}>
                            {getStatusLabel(load.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">
                          {load.pickupFacility.city}, {load.pickupFacility.state} → {load.dropoffFacility.city}, {load.dropoffFacility.state}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {load.shipper.companyName} • {load.actualDeliveryTime ? formatDateTime(load.actualDeliveryTime) : formatDate(load.createdAt)}
                        </p>
                      </div>
                      {load.quoteAmount && (
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{formatCurrency(load.quoteAmount)}</p>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
