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
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month')

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
        fetchLoads(data.user.id)
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

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

  // Helper function - must be defined before useMemo
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
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50'
      case 'EN_ROUTE':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50'
      case 'PICKED_UP':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
      case 'IN_TRANSIT':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50'
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50'
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
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50'
      case 'REFRIGERATED':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
      case 'AMBIENT':
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50'
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50'
    }
  }

  // Calendar helper functions
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    
    // Add days from previous month to fill first week
    const startDay = firstDay.getDay()
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push(prevDate)
    }
    
    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    // Add days from next month to fill last week
    const endDay = lastDay.getDay()
    for (let i = 1; i < 7 - endDay; i++) {
      days.push(new Date(year, month + 1, i))
    }
    
    return days
  }

  const getWeekDays = (date: Date): Date[] => {
    const weekStart = getWeekStart(date)
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getLoadsForDate = (date: Date): Load[] => {
    const dateStr = date.toDateString()
    return loads.filter((load) => {
      const loadDate = load.readyTime
        ? new Date(load.readyTime).toDateString()
        : load.deliveryDeadline
        ? new Date(load.deliveryDeadline).toDateString()
        : new Date(load.createdAt).toDateString()
      return loadDate === dateStr
    })
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear()
  }

  // Calendar render functions
  const renderMonthView = () => {
    const days = getDaysInMonth(selectedDate)
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    return (
      <div className="p-6">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-slate-300 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dayLoads = getLoadsForDate(day)
            const isCurrentDay = isToday(day)
            const isCurrentMonthDay = isCurrentMonth(day)
            
            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 rounded-lg border-2 transition-all ${
                  isCurrentDay
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 border-teal-400 shadow-medical'
                    : isCurrentMonthDay
                    ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70'
                    : 'bg-slate-800/40 border-slate-700/30 opacity-60'
                }`}
              >
                <div className={`text-sm font-semibold mb-1 ${isCurrentDay ? 'text-white' : 'text-slate-300'}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayLoads.slice(0, 3).map((load) => (
                    <Link
                      key={load.id}
                      href={`/driver/loads/${load.id}`}
                      className="block text-xs p-1.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-medium truncate border border-blue-500/50 transition-colors"
                      title={`${load.publicTrackingCode} - ${load.commodityDescription}`}
                    >
                      {formatTime(load.readyTime)} {load.publicTrackingCode}
                    </Link>
                  ))}
                  {dayLoads.length > 3 && (
                    <div className="text-xs text-slate-300 font-medium px-1.5">
                      +{dayLoads.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekDays = getWeekDays(selectedDate)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    return (
      <div className="p-6">
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const dayLoads = getLoadsForDate(day)
            const isCurrentDay = isToday(day)
            
            return (
              <div
                key={index}
                className={`min-h-[400px] p-4 rounded-lg border-2 ${
                  isCurrentDay
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 border-teal-400 shadow-medical'
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}
              >
                <div className={`mb-4 ${isCurrentDay ? 'text-white' : 'text-white'}`}>
                  <div className="text-sm font-semibold">{dayNames[index]}</div>
                  <div className="text-lg font-bold">{day.getDate()}</div>
                  <div className="text-xs opacity-80">
                    {day.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                </div>
                <div className="space-y-2">
                  {dayLoads.length === 0 ? (
                    <p className={`text-sm ${isCurrentDay ? 'text-white/80' : 'text-slate-400'}`}>
                      No loads
                    </p>
                  ) : (
                    dayLoads.map((load) => (
                      <Link
                        key={load.id}
                        href={`/driver/loads/${load.id}`}
                        className="block p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono font-bold text-cyan-400 text-sm font-data">
                            {load.publicTrackingCode}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(load.status)}`}>
                            {getStatusLabel(load.status)}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-white mb-1 truncate">
                          {load.commodityDescription}
                        </p>
                        {load.readyTime && (
                          <p className="text-xs text-blue-300 font-medium">
                            {formatTime(load.readyTime)}
                          </p>
                        )}
                        {load.quoteAmount && (
                          <p className="text-xs font-bold text-cyan-400 mt-1 font-data">
                            ${load.quoteAmount.toFixed(2)}
                          </p>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const dayLoads = getLoadsForDate(selectedDate)
    const isCurrentDay = isToday(selectedDate)
    
    return (
      <div className="p-6">
        <div className={`mb-6 p-4 rounded-lg border-2 ${
          isCurrentDay
            ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 border-cyan-500 shadow-lg shadow-cyan-500/30'
            : 'bg-slate-800/40 border-slate-700/50'
        }`}>
          <div className={`text-2xl font-bold ${isCurrentDay ? 'text-white' : 'text-white'}`}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        
        {dayLoads.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg mb-4">No loads scheduled for this day</p>
            <Link
              href="/driver/dashboard"
              className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-lg"
            >
              View Load Board
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {dayLoads.map((load) => (
              <Link
                key={load.id}
                href={`/driver/loads/${load.id}`}
                className="block glass-primary rounded-xl p-5 border border-slate-700/50 shadow-medical hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono font-bold text-cyan-400 text-lg font-data">
                        {load.publicTrackingCode}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(load.status)}`}>
                        {getStatusLabel(load.status)}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTemperatureColor(load.temperatureRequirement)}`}>
                        {load.temperatureRequirement}
                      </span>
                    </div>
                    <p className="text-white font-semibold mb-1">{load.commodityDescription}</p>
                    <p className="text-sm text-slate-300 mb-3">
                      {load.shipper.companyName} • {load.serviceType}
                    </p>
                  </div>
                  {load.quoteAmount && (
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-white font-data">${load.quoteAmount.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-3 bg-blue-500/20 rounded-lg border border-blue-500/50">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-300 mb-1">PICKUP</p>
                      <p className="text-sm font-medium text-white truncate">{load.pickupFacility.name}</p>
                      <p className="text-xs text-slate-300">{load.pickupFacility.city}, {load.pickupFacility.state}</p>
                      {load.readyTime && (
                        <p className="text-xs text-blue-300 font-medium mt-1">
                          Ready: {formatTime(load.readyTime)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-green-500/20 rounded-lg border border-green-500/50">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-green-300 mb-1">DELIVERY</p>
                      <p className="text-sm font-medium text-white truncate">{load.dropoffFacility.name}</p>
                      <p className="text-xs text-slate-300">{load.dropoffFacility.city}, {load.dropoffFacility.state}</p>
                      {load.deliveryDeadline && (
                        <p className="text-xs text-green-300 font-medium mt-1">
                          Deadline: {formatTime(load.deliveryDeadline)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading scheduler...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[100px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
              Load Scheduler
            </h1>
            <p className="text-slate-400">Visual timeline of your scheduled loads</p>
          </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 glass-primary rounded-lg p-2 border border-slate-700/50">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                Calendar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 print:p-4">
      {/* Stats - Separate, scrolls with page */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
          <div className="text-2xl font-bold text-white font-data">{loads.length}</div>
          <div className="text-xs text-slate-400">Total Scheduled</div>
        </div>
        <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
          <div className="text-2xl font-bold text-white font-data">
            {loads.filter(l => l.status === 'SCHEDULED').length}
          </div>
          <div className="text-xs text-slate-400">Scheduled</div>
        </div>
        <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
          <div className="text-2xl font-bold text-white font-data">
            {loads.filter(l => ['PICKED_UP', 'IN_TRANSIT'].includes(l.status)).length}
          </div>
          <div className="text-xs text-slate-400">In Progress</div>
        </div>
        <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-lg">
          <div className="text-2xl font-bold text-white font-data">
            ${loads.reduce((sum, l) => sum + (l.quoteAmount || 0), 0).toFixed(0)}
          </div>
          <div className="text-xs text-slate-400">Total Value</div>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-8">
          {groupedLoads.length === 0 ? (
            <div className="glass-primary rounded-xl p-12 text-center border border-slate-700/50 shadow-lg">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-bold text-white mb-2">No Scheduled Loads</h3>
              <p className="text-slate-400 mb-6">
                You don't have any scheduled loads yet. Once you accept a load and submit a finalized rate, it will appear here.
              </p>
              <Link
                href="/driver/dashboard"
                className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-lg shadow-cyan-500/30"
              >
                View Load Board
              </Link>
            </div>
          ) : (
            groupedLoads.map((dayGroup) => (
              <div key={dayGroup.date.toISOString()} className="glass-primary rounded-2xl border border-slate-700/50 shadow-medical overflow-hidden">
                {/* Day Header */}
                <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-4 border-b-2 border-slate-700/50">
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
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-700/50"></div>

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
                            'bg-slate-500'
                          }`}></div>

                          {/* Load Card */}
                          <Link href={`/driver/loads/${load.id}`}>
                            <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-medical hover:shadow-lg transition-all cursor-pointer group">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="font-mono font-bold text-cyan-400 text-lg">
                                      {load.publicTrackingCode}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(load.status)}`}>
                                      {getStatusLabel(load.status)}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTemperatureColor(load.temperatureRequirement)}`}>
                                      {load.temperatureRequirement}
                                    </span>
                                  </div>
                                  <p className="text-white font-semibold mb-1">{load.commodityDescription}</p>
                                  <p className="text-sm text-slate-300 mb-3">
                                    {load.shipper.companyName} • {load.serviceType}
                                  </p>
                                </div>
                                {load.quoteAmount && (
                                  <div className="text-right ml-4">
                                    <p className="text-2xl font-bold text-white">${load.quoteAmount.toFixed(2)}</p>
                                  </div>
                                )}
                              </div>

                              {/* Route Info */}
                              <div className="grid md:grid-cols-2 gap-4 mb-4">
                                {/* Pickup */}
                                <div className="flex items-start gap-3 p-3 bg-blue-500/20 rounded-lg border border-blue-500/50">
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-blue-300 mb-1">PICKUP</p>
                                    <p className="text-sm font-medium text-white truncate">{load.pickupFacility.name}</p>
                                    <p className="text-xs text-slate-300">{load.pickupFacility.city}, {load.pickupFacility.state}</p>
                                    {load.readyTime && (
                                      <p className="text-xs text-blue-300 font-medium mt-1">
                                        Ready: {formatTime(load.readyTime)}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Delivery */}
                                <div className="flex items-start gap-3 p-3 bg-green-500/20 rounded-lg border border-green-500/50">
                                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-green-300 mb-1">DELIVERY</p>
                                    <p className="text-sm font-medium text-white truncate">{load.dropoffFacility.name}</p>
                                    <p className="text-xs text-slate-300">{load.dropoffFacility.city}, {load.dropoffFacility.state}</p>
                                    {load.deliveryDeadline && (
                                      <p className="text-xs text-green-300 font-medium mt-1">
                                        Deadline: {formatTime(load.deliveryDeadline)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Time Summary */}
                              <div className="flex items-center gap-4 text-xs text-slate-300 pt-3 border-t border-slate-700/50">
                                {load.readyTime && (
                                  <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Ready: {formatDateTime(load.readyTime)}</span>
                                  </div>
                                )}
                                {load.deliveryDeadline && (
                                  <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="space-y-6">
          {/* Calendar Controls */}
          <div className="glass-primary rounded-xl p-4 border border-slate-700/50 shadow-medical">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate)
                    if (calendarView === 'month') {
                      newDate.setMonth(newDate.getMonth() - 1)
                    } else if (calendarView === 'week') {
                      newDate.setDate(newDate.getDate() - 7)
                    } else {
                      newDate.setDate(newDate.getDate() - 1)
                    }
                    setSelectedDate(newDate)
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-semibold hover:shadow-lg transition-all shadow-lg"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate)
                    if (calendarView === 'month') {
                      newDate.setMonth(newDate.getMonth() + 1)
                    } else if (calendarView === 'week') {
                      newDate.setDate(newDate.getDate() + 7)
                    } else {
                      newDate.setDate(newDate.getDate() + 1)
                    }
                    setSelectedDate(newDate)
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white min-w-[200px] text-center">
                  {calendarView === 'month'
                    ? selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : calendarView === 'week'
                    ? `Week of ${getWeekStart(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm rounded-lg p-1 border border-slate-700/50">
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                    calendarView === 'month'
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-medical'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                    calendarView === 'week'
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-medical'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCalendarView('day')}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                    calendarView === 'day'
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-medical'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  Day
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Display */}
          <div className="glass-primary rounded-2xl border border-slate-700/50 shadow-medical overflow-hidden">
            {calendarView === 'month' && renderMonthView()}
            {calendarView === 'week' && renderWeekView()}
            {calendarView === 'day' && renderDayView()}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
