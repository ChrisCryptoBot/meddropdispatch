'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showToast } from '@/lib/toast'

interface Load {
  id: string
  publicTrackingCode: string
  status: string
  serviceType: string
  quoteAmount?: number
  readyTime?: string
  deliveryDeadline?: string
  commodityDescription: string
  temperatureRequirement: string
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
  createdAt: string
}

interface DayGroup {
  date: Date
  dateLabel: string
  loads: Load[]
}

export default function DriverSchedulerPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [loads, setLoads] = useState<Load[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('week')

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
      setIsLoading(true)
      const response = await fetch(`/api/drivers/${driverId}/my-loads`)
      if (!response.ok) throw new Error('Failed to fetch loads')
      const data = await response.json()
      
      // Filter to only show scheduled loads (SCHEDULED, EN_ROUTE, PICKED_UP, IN_TRANSIT)
      const scheduledLoads = (data.loads || []).filter((load: Load) => 
        ['SCHEDULED', 'EN_ROUTE', 'PICKED_UP', 'IN_TRANSIT'].includes(load.status)
      )
      setLoads(scheduledLoads)
    } catch (error) {
      console.error('Error fetching loads:', error)
      showToast.error('Failed to load scheduled loads')
    } finally {
      setIsLoading(false)
    }
  }

  // Group loads by date based on readyTime or deliveryDeadline
  const groupedLoads = useMemo(() => {
    const groups: DayGroup[] = []
    const dateMap = new Map<string, Load[]>()

    loads.forEach((load) => {
      // Use readyTime if available, otherwise use deliveryDeadline, otherwise use createdAt
      const dateKey = load.readyTime 
        ? new Date(load.readyTime).toDateString()
        : load.deliveryDeadline
        ? new Date(load.deliveryDeadline).toDateString()
        : new Date(load.createdAt).toDateString()

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, [])
      }
      dateMap.get(dateKey)!.push(load)
    })

    // Convert to array and sort by date
    dateMap.forEach((loads, dateKey) => {
      const date = new Date(dateKey)
      groups.push({
        date,
        dateLabel: formatDateLabel(date),
        loads: loads.sort((a, b) => {
          const aTime = a.readyTime ? new Date(a.readyTime).getTime() : 0
          const bTime = b.readyTime ? new Date(b.readyTime).getTime() : 0
          return aTime - bTime
        }),
      })
    })

    return groups.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [loads, dateRange])

  const formatDateLabel = (date: Date): string => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)

    if (dateOnly.getTime() === today.getTime()) {
      return 'Today'
    } else if (dateOnly.getTime() === tomorrow.getTime()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    }
  }

  const formatTime = (dateString?: string): string => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'EN_ROUTE':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'PICKED_UP':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'IN_TRANSIT':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'SCHEDULED':
        return 'Scheduled'
      case 'EN_ROUTE':
        return 'En Route'
      case 'PICKED_UP':
        return 'Picked Up'
      case 'IN_TRANSIT':
        return 'In Transit'
      default:
        return status
    }
  }

  const getTemperatureColor = (temp: string): string => {
    switch (temp) {
      case 'FROZEN':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'REFRIGERATED':
        return 'bg-teal-50 text-teal-700 border-teal-200'
      case 'AMBIENT':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading scheduler...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      {/* Title Container - Gold Standard */}
      <div className="sticky top-[73px] z-30 bg-gradient-medical-bg pt-10 pb-4 mb-8 print:mb-4 print:static print:top-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">Load Scheduler</h1>
            <p className="text-gray-600 print:text-sm">Visual timeline of your scheduled loads</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-lg p-2 border border-teal-200/30">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-gradient-accent text-white shadow-medical'
                    : 'text-gray-700 hover:bg-teal-50/60'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-gradient-accent text-white shadow-medical'
                    : 'text-gray-700 hover:bg-teal-50/60'
                }`}
              >
                Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-accent rounded-xl p-4 border-2 border-teal-200/30 shadow-medical">
            <div className="text-2xl font-bold text-gray-900">{loads.length}</div>
            <div className="text-xs text-gray-600">Total Scheduled</div>
          </div>
          <div className="glass-accent rounded-xl p-4 border-2 border-teal-200/30 shadow-medical">
            <div className="text-2xl font-bold text-blue-600">
              {loads.filter(l => l.status === 'SCHEDULED').length}
            </div>
            <div className="text-xs text-gray-600">Scheduled</div>
          </div>
          <div className="glass-accent rounded-xl p-4 border-2 border-teal-200/30 shadow-medical">
            <div className="text-2xl font-bold text-orange-600">
              {loads.filter(l => ['PICKED_UP', 'IN_TRANSIT'].includes(l.status)).length}
            </div>
            <div className="text-xs text-gray-600">In Progress</div>
          </div>
          <div className="glass-accent rounded-xl p-4 border-2 border-teal-200/30 shadow-medical">
            <div className="text-2xl font-bold text-teal-600">
              ${loads.reduce((sum, l) => sum + (l.quoteAmount || 0), 0).toFixed(0)}
            </div>
            <div className="text-xs text-gray-600">Total Value</div>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-8">
          {groupedLoads.length === 0 ? (
            <div className="glass-accent rounded-2xl p-12 text-center border-2 border-teal-200/30 shadow-medical">
              <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Scheduled Loads</h3>
              <p className="text-gray-600 mb-6">
                You don't have any scheduled loads yet. Once you accept a load and submit a finalized rate, it will appear here.
              </p>
              <Link
                href="/driver/dashboard"
                className="inline-block px-6 py-3 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-lg"
              >
                View Load Board
              </Link>
            </div>
          ) : (
            groupedLoads.map((dayGroup) => (
              <div key={dayGroup.date.toISOString()} className="glass-accent rounded-2xl border-2 border-teal-200/30 shadow-medical overflow-hidden">
                {/* Day Header */}
                <div className="bg-gradient-accent px-6 py-4 border-b-2 border-teal-200/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{dayGroup.dateLabel}</h2>
                        <p className="text-sm text-white/80">{dayGroup.loads.length} {dayGroup.loads.length === 1 ? 'load' : 'loads'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white/80 font-medium">
                        {dayGroup.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Loads Timeline */}
                <div className="p-6">
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-teal-200/50"></div>

                    {/* Load Items */}
                    <div className="space-y-6">
                      {dayGroup.loads.map((load, index) => (
                        <div key={load.id} className="relative pl-16">
                          {/* Timeline Dot */}
                          <div className={`absolute left-4 top-6 w-4 h-4 rounded-full border-2 border-white shadow-medical ${
                            load.status === 'SCHEDULED' ? 'bg-blue-500' :
                            load.status === 'EN_ROUTE' ? 'bg-purple-500' :
                            load.status === 'PICKED_UP' ? 'bg-yellow-500' :
                            load.status === 'IN_TRANSIT' ? 'bg-orange-500' :
                            'bg-gray-500'
                          }`}></div>

                          {/* Load Card */}
                          <Link href={`/driver/loads/${load.id}`}>
                            <div className="glass-primary rounded-xl p-5 border-2 border-teal-200/30 shadow-medical hover:shadow-lg transition-all cursor-pointer group">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="font-mono font-bold text-accent-700 text-lg">
                                      {load.publicTrackingCode}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(load.status)}`}>
                                      {getStatusLabel(load.status)}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTemperatureColor(load.temperatureRequirement)}`}>
                                      {load.temperatureRequirement}
                                    </span>
                                  </div>
                                  <p className="text-gray-900 font-semibold mb-1">{load.commodityDescription}</p>
                                  <p className="text-sm text-gray-600 mb-3">
                                    {load.shipper.companyName} • {load.serviceType}
                                  </p>
                                </div>
                                {load.quoteAmount && (
                                  <div className="text-right ml-4">
                                    <p className="text-2xl font-bold text-accent-700">${load.quoteAmount.toFixed(2)}</p>
                                  </div>
                                )}
                              </div>

                              {/* Route Info */}
                              <div className="grid md:grid-cols-2 gap-4 mb-4">
                                {/* Pickup */}
                                <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-200/30">
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-blue-700 mb-1">PICKUP</p>
                                    <p className="text-sm font-medium text-gray-900 truncate">{load.pickupFacility.name}</p>
                                    <p className="text-xs text-gray-600">{load.pickupFacility.city}, {load.pickupFacility.state}</p>
                                    {load.readyTime && (
                                      <p className="text-xs text-blue-600 font-medium mt-1">
                                        Ready: {formatTime(load.readyTime)}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Delivery */}
                                <div className="flex items-start gap-3 p-3 bg-green-50/50 rounded-lg border border-green-200/30">
                                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-green-700 mb-1">DELIVERY</p>
                                    <p className="text-sm font-medium text-gray-900 truncate">{load.dropoffFacility.name}</p>
                                    <p className="text-xs text-gray-600">{load.dropoffFacility.city}, {load.dropoffFacility.state}</p>
                                    {load.deliveryDeadline && (
                                      <p className="text-xs text-green-600 font-medium mt-1">
                                        Deadline: {formatTime(load.deliveryDeadline)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Time Summary */}
                              <div className="flex items-center gap-4 text-xs text-gray-600 pt-3 border-t border-teal-200/30">
                                {load.readyTime && (
                                  <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Ready: {formatDateTime(load.readyTime)}</span>
                                  </div>
                                )}
                                {load.deliveryDeadline && (
                                  <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Deadline: {formatDateTime(load.deliveryDeadline)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Calendar View - Placeholder for future implementation */}
      {viewMode === 'calendar' && (
        <div className="glass-accent rounded-2xl p-12 text-center border-2 border-teal-200/30 shadow-medical">
          <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Calendar View</h3>
          <p className="text-gray-600 mb-6">
            Calendar view is coming soon. Use the timeline view to see your scheduled loads organized by date.
          </p>
          <button
            onClick={() => setViewMode('timeline')}
            className="inline-block px-6 py-3 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-lg"
          >
            Switch to Timeline View
          </button>
        </div>
      )}
    </div>
  )
}

