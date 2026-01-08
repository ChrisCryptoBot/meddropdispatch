'use client'

// Visual Dispatch Board (Fleet Enterprise - Tier 3)
// Gantt-style timeline view for drivers and loads with map integration

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { showToast, showApiError } from '@/lib/toast'
import { formatDateTime, formatDate } from '@/lib/utils'
import { LOAD_STATUS_COLORS, LOAD_STATUS_LABELS } from '@/lib/constants'
import { EmptyStates } from '@/components/ui/EmptyState'
import dynamic from 'next/dynamic'

// Dynamically import Leaflet to avoid SSR issues
const GPSTrackingMap = dynamic(() => import('@/components/features/GPSTrackingMap'), { ssr: false })

interface Driver {
  id: string
  name: string
  email: string
  phone: string
  status: string
  fleetId: string | null
  fleetName: string | null
  fleetRole: string
  vehicleType: string | null
  vehicles: Array<{ id: string; vehiclePlate: string; vehicleType: string }>
  currentShift: {
    id: string
    clockIn: string
    clockOut: string | null
    totalHours: number | null
    currentHours: number | null
  } | null
  assignedLoads: Array<{
    id: string
    trackingCode: string
    status: string
    readyTime: string | null
    deliveryDeadline: string | null
    estimatedStartTime: string | null
    estimatedEndTime: string | null
    duration: number
    pickup: { name: string; address: string; latitude: number | null; longitude: number | null }
    dropoff: { name: string; address: string; latitude: number | null; longitude: number | null }
    vehiclePlate: string | null
    shipper: string
  }>
  lastKnownLocation: {
    latitude: number
    longitude: number
    timestamp: string
    accuracy: number | null
  } | null
}

interface UnassignedLoad {
  id: string
  trackingCode: string
  status: string
  readyTime: string | null
  deliveryDeadline: string | null
  shipper: string
  pickup: { name: string; address: string; latitude: number | null; longitude: number | null }
  dropoff: { name: string; address: string; latitude: number | null; longitude: number | null }
  estimatedDuration: number
}

const HOUR_WIDTH = 80 // Pixels per hour in timeline
const DRIVER_ROW_HEIGHT = 80 // Height of each driver row

export default function DispatchBoardPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [unassignedLoads, setUnassignedLoads] = useState<UnassignedLoad[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<{ start: string; end: string } | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [showMap, setShowMap] = useState(true)
  const [draggedLoad, setDraggedLoad] = useState<UnassignedLoad | null>(null)
  const [selectedLoad, setSelectedLoad] = useState<string | null>(null)
  const [selectedLoadsForBulk, setSelectedLoadsForBulk] = useState<Set<string>>(new Set())
  const [isBulkAssigning, setIsBulkAssigning] = useState(false)
  const [showBulkAssignMenu, setShowBulkAssignMenu] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const timelineRef = useRef<HTMLDivElement>(null)

  // Update current time every minute for timeline
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // Fetch dispatch board data
  useEffect(() => {
    fetchDispatchData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDispatchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDispatchData = async () => {
    try {
      const response = await fetch('/api/admin/dispatch/board', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setDrivers(data.drivers || [])
        setUnassignedLoads(data.unassignedLoads || [])
        setTimeRange(data.timeRange || null)
      } else {
        throw new Error('Failed to fetch dispatch data')
      }
    } catch (error) {
      console.error('Error fetching dispatch data:', error)
      showApiError(error, 'Failed to fetch dispatch board data')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate timeline hours (24-hour view starting from now)
  const timelineHours = useMemo(() => {
    const hours: Date[] = []
    const start = new Date(currentTime)
    start.setHours(0, 0, 0, 0) // Start of today
    for (let i = 0; i < 24; i++) {
      const hour = new Date(start)
      hour.setHours(hour.getHours() + i)
      hours.push(hour)
    }
    return hours
  }, [currentTime])

  // Calculate current time position in timeline
  const currentTimePosition = useMemo(() => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const hoursSinceStart = (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60)
    return hoursSinceStart * HOUR_WIDTH
  }, [currentTime])

  // Handle drag start for unassigned loads
  const handleDragStart = (load: UnassignedLoad) => {
    setDraggedLoad(load)
  }

  // Handle drag over driver row
  const handleDragOver = (e: React.DragEvent, driver: Driver) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // Handle drop load onto driver
  const handleDrop = async (e: React.DragEvent, driver: Driver) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedLoad) return

    try {
      const response = await fetch(`/api/load-requests/${draggedLoad.id}/assign-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ driverId: driver.id }),
      })

      if (response.ok) {
        showToast.success(`Assigned ${draggedLoad.trackingCode} to ${driver.name}`)
        setDraggedLoad(null)
        await fetchDispatchData()
      } else {
        const error = await response.json()
        showApiError(error, 'Failed to assign load')
      }
    } catch (error) {
      showApiError(error, 'Failed to assign load')
    }
  }

  // Handle bulk assignment of selected loads to driver
  const handleBulkAssign = async (driver: Driver) => {
    if (selectedLoadsForBulk.size === 0) {
      showToast.warning('Please select at least one load')
      return
    }

    setIsBulkAssigning(true)
    setShowBulkAssignMenu(false)

    try {
      const response = await fetch('/api/load-requests/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'assign_driver',
          loadRequestIds: Array.from(selectedLoadsForBulk),
          driverId: driver.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        showToast.success(data.result?.message || `Successfully assigned ${selectedLoadsForBulk.size} load(s) to ${driver.name}`)
        setSelectedLoadsForBulk(new Set())
        await fetchDispatchData()
      } else {
        const error = await response.json()
        // Handle Edge Case 6.4: Atomic Bulk Verification errors
        if (error.error === 'BulkAssignmentValidationFailed' && error.details) {
          const failedCodes = error.details.failedTrackingCodes
          showToast.error(`Bulk assignment rejected: ${error.details.failed} of ${error.details.totalLoads} loads failed validation. Failed: ${failedCodes}`)
          // Optionally show detailed errors in a modal or expandable section
          console.error('Bulk assignment validation errors:', error.details.failedLoads)
        } else {
          showApiError(error, 'Failed to assign loads')
        }
      }
    } catch (error) {
      showApiError(error, 'Failed to assign loads')
    } finally {
      setIsBulkAssigning(false)
    }
  }

  // Toggle load selection for bulk operations
  const toggleLoadSelection = (loadId: string) => {
    const newSelected = new Set(selectedLoadsForBulk)
    if (newSelected.has(loadId)) {
      newSelected.delete(loadId)
    } else {
      newSelected.add(loadId)
    }
    setSelectedLoadsForBulk(newSelected)
  }

  // Select all loads
  const selectAllLoads = () => {
    if (selectedLoadsForBulk.size === unassignedLoads.length) {
      setSelectedLoadsForBulk(new Set())
    } else {
      setSelectedLoadsForBulk(new Set(unassignedLoads.map(l => l.id)))
    }
  }

  // Calculate load bar position and width
  const getLoadBarStyle = (load: typeof drivers[0]['assignedLoads'][0]) => {
    const startTime = load.estimatedStartTime ? new Date(load.estimatedStartTime) : new Date()
    const endTime = load.estimatedEndTime ? new Date(load.estimatedEndTime) : new Date(startTime.getTime() + load.duration * 60 * 60 * 1000)
    
    const startOfDay = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate())
    const left = ((startTime.getTime() - startOfDay.getTime()) / (1000 * 60 * 60)) * HOUR_WIDTH
    const width = ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)) * HOUR_WIDTH

    return {
      left: `${Math.max(0, left)}px`,
      width: `${Math.max(HOUR_WIDTH * 0.5, width)}px`, // Minimum 30 min width
    }
  }

  // Check if load is delayed (past estimated end time and still in progress)
  const isLoadDelayed = (load: typeof drivers[0]['assignedLoads'][0]) => {
    if (!load.estimatedEndTime) return false
    const endTime = new Date(load.estimatedEndTime)
    const now = new Date()
    return now > endTime && ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(load.status)
  }

  // Get status color for load bar
  const getLoadStatusColor = (status: string, isDelayed: boolean) => {
    if (isDelayed) return 'bg-red-500'
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-500'
      case 'PICKED_UP': return 'bg-cyan-500'
      case 'IN_TRANSIT': return 'bg-green-500'
      default: return 'bg-slate-500'
    }
  }

  // Get map bounds from all drivers and loads
  const getMapBounds = () => {
    const locations: Array<{ lat: number; lng: number }> = []
    
    drivers.forEach(driver => {
      if (driver.lastKnownLocation) {
        locations.push({ lat: driver.lastKnownLocation.latitude, lng: driver.lastKnownLocation.longitude })
      }
      driver.assignedLoads.forEach(load => {
        if (load.pickup.latitude && load.pickup.longitude) {
          locations.push({ lat: load.pickup.latitude, lng: load.pickup.longitude })
        }
        if (load.dropoff.latitude && load.dropoff.longitude) {
          locations.push({ lat: load.dropoff.latitude, lng: load.dropoff.longitude })
        }
      })
    })

    unassignedLoads.forEach(load => {
      if (load.pickup.latitude && load.pickup.longitude) {
        locations.push({ lat: load.pickup.latitude, lng: load.pickup.longitude })
      }
      if (load.dropoff.latitude && load.dropoff.longitude) {
        locations.push({ lat: load.dropoff.latitude, lng: load.dropoff.longitude })
      }
    })

    return locations
  }

  if (isLoading) {
    return (
      <div className="px-6 md:px-8 pb-6 md:pb-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-85px)] flex flex-col px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-0 z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
              Visual Dispatch Board
            </h1>
            <p className="text-slate-400 text-sm md:text-base">Real-time driver timeline and load assignments</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMap(!showMap)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                showMap
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700/70'
              }`}
            >
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
            <button
              onClick={fetchDispatchData}
              className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold border border-slate-600/50 hover:bg-slate-700/70 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
        {/* Left Side: Timeline */}
        <div className={`${showMap ? 'col-span-8' : 'col-span-10'} flex flex-col overflow-hidden`}>
          {/* Timeline Header */}
          <div className="glass-primary rounded-xl border border-slate-700/50 overflow-hidden mb-4">
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-white">Driver Timeline</h2>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Scheduled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-cyan-500 rounded"></div>
                    <span>Picked Up</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>In Transit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span>Delayed</span>
                  </div>
                </div>
              </div>
              {/* Time scale */}
              <div className="relative h-12 border-b border-slate-700/50 overflow-x-auto">
                <div className="relative" style={{ width: `${24 * HOUR_WIDTH}px`, minWidth: '100%' }}>
                  {timelineHours.map((hour, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 border-l border-slate-600/30 text-xs text-slate-400 px-1"
                      style={{ left: `${idx * HOUR_WIDTH}px` }}
                    >
                      {hour.getHours().toString().padStart(2, '0')}:00
                    </div>
                  ))}
                  {/* Current time indicator */}
                  {currentTimePosition >= 0 && currentTimePosition < 24 * HOUR_WIDTH && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
                      style={{ left: `${currentTimePosition}px` }}
                    >
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs text-red-400 font-bold whitespace-nowrap bg-slate-900/90 px-1 rounded">
                        Now
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Driver Rows */}
            <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              {drivers.length === 0 ? (
                <div className="p-12 text-center">
                  <EmptyStates.NoLoads
                    title="No drivers available"
                    description="No active drivers found for dispatch"
                  />
                </div>
              ) : (
                drivers.map((driver) => (
                  <div
                    key={driver.id}
                    className={`border-b border-slate-700/50 p-4 relative ${
                      selectedDriver?.id === driver.id ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'
                    } transition-colors`}
                    style={{ minHeight: `${DRIVER_ROW_HEIGHT}px` }}
                    onDragOver={(e) => handleDragOver(e, driver)}
                    onDrop={(e) => handleDrop(e, driver)}
                    onClick={() => setSelectedDriver(driver)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Driver Info */}
                      <div className="w-48 flex-shrink-0">
                        <div className="font-semibold text-white">{driver.name}</div>
                        <div className="text-xs text-slate-400">
                          {driver.fleetName && <span className="text-cyan-400">{driver.fleetName}</span>}
                          {driver.fleetName && ' • '}
                          {driver.vehicles[0]?.vehiclePlate || 'No vehicle'}
                        </div>
                        {driver.currentShift && (
                          <div className="text-xs text-green-400 mt-1">
                            On Shift: {driver.currentShift.currentHours?.toFixed(1)}h
                          </div>
                        )}
                      </div>

                      {/* Timeline Bar Area */}
                      <div className="flex-1 relative overflow-x-auto">
                        <div className="relative" style={{ height: `${DRIVER_ROW_HEIGHT}px`, width: `${24 * HOUR_WIDTH}px`, minWidth: '100%' }}>
                          {driver.assignedLoads.map((load) => {
                            const delayed = isLoadDelayed(load)
                            const style = getLoadBarStyle(load)
                            return (
                              <div
                                key={load.id}
                                className={`absolute top-2 bottom-2 rounded-lg ${getLoadStatusColor(load.status, delayed)} ${
                                  selectedLoad === load.id ? 'ring-2 ring-cyan-400 ring-offset-2' : ''
                                } cursor-pointer transition-all hover:opacity-90 hover:scale-105 shadow-lg z-10`}
                                style={style}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedLoad(load.id)
                                window.open(`/admin/loads/${load.id}`, '_blank')
                              }}
                              title={`${load.trackingCode} - ${LOAD_STATUS_LABELS[load.status as keyof typeof LOAD_STATUS_LABELS] || load.status} (Click to view details)`}
                            >
                              <Link
                                href={`/admin/loads/${load.id}`}
                                target="_blank"
                                className="h-full flex flex-col justify-center px-2 text-white text-xs overflow-hidden no-underline hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="font-semibold truncate">{load.trackingCode}</div>
                                <div className="text-xs opacity-90 truncate">{load.shipper}</div>
                                {delayed && (
                                  <div className="text-xs font-bold mt-1">⚠ DELAYED</div>
                                )}
                              </Link>
                            </div>
                            )
                          })}
                          {/* Drop zone indicator when dragging */}
                          {draggedLoad && (
                            <div className="absolute inset-0 border-2 border-dashed border-cyan-400 bg-cyan-400/10 z-20 pointer-events-none">
                              <div className="absolute inset-0 flex items-center justify-center text-cyan-400 font-semibold">
                                Drop here to assign {draggedLoad.trackingCode}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Map + Unassigned Loads Queue */}
        {showMap && (
          <div className="col-span-4 flex flex-col gap-4">
            {/* Map */}
            <div className="flex-1 glass-primary rounded-xl border border-slate-700/50 overflow-hidden min-h-[300px]">
              <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
                <h2 className="text-lg font-bold text-white">Driver Locations & Routes</h2>
              </div>
              <div className="h-[300px] relative bg-slate-900 rounded-lg overflow-hidden">
                {selectedDriver && selectedDriver.lastKnownLocation ? (
                  <div className="h-full w-full">
                    <GPSTrackingMap
                      loadId={selectedDriver.id}
                      pickupAddress={selectedDriver.assignedLoads[0]?.pickup.address || selectedDriver.assignedLoads[0]?.pickup.name || ''}
                      dropoffAddress={selectedDriver.assignedLoads[0]?.dropoff.address || selectedDriver.assignedLoads[0]?.dropoff.name || ''}
                      enabled={true}
                      driver={{
                        id: selectedDriver.id,
                        firstName: selectedDriver.name.split(' ')[0],
                        lastName: selectedDriver.name.split(' ').slice(1).join(' '),
                        phone: selectedDriver.phone,
                        vehicleType: selectedDriver.vehicleType || undefined,
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
                    <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm">Select a driver to view location</p>
                    <p className="text-xs text-slate-500 mt-2">Map shows driver location and assigned routes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Unassigned Loads Queue */}
            <div className="flex-1 glass-primary rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-700/50 bg-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-white">
                    Unassigned Loads
                    {unassignedLoads.length > 0 && (
                      <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-semibold border border-orange-500/30">
                        {unassignedLoads.length}
                      </span>
                    )}
                  </h2>
                  {unassignedLoads.length > 0 && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedLoadsForBulk.size === unassignedLoads.length && unassignedLoads.length > 0}
                        onChange={selectAllLoads}
                        className="w-4 h-4 rounded border-slate-600/50 bg-slate-800/50 text-cyan-600 focus:ring-cyan-500/50"
                      />
                      <span className="text-xs text-slate-400">Select All</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400">Drag loads to assign, or select multiple for bulk assignment</p>
                {selectedLoadsForBulk.size > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm text-cyan-400 font-semibold">
                      {selectedLoadsForBulk.size} selected
                    </span>
                    <button
                      onClick={() => setShowBulkAssignMenu(!showBulkAssignMenu)}
                      disabled={isBulkAssigning}
                      className="ml-auto px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBulkAssigning ? 'Assigning...' : 'Assign to Driver'}
                    </button>
                  </div>
                )}
              </div>
              {showBulkAssignMenu && selectedLoadsForBulk.size > 0 && (
                <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
                  <p className="text-sm text-slate-300 mb-3">Select driver to assign {selectedLoadsForBulk.size} load(s):</p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {drivers.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-2">No drivers available</p>
                    ) : (
                      drivers.map((driver) => (
                        <button
                          key={driver.id}
                          onClick={() => handleBulkAssign(driver)}
                          disabled={isBulkAssigning}
                          className="w-full px-3 py-2 text-left bg-slate-700/50 hover:bg-slate-700/70 rounded-lg border border-slate-600/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="font-semibold text-white text-sm">{driver.name}</div>
                          <div className="text-xs text-slate-400">
                            {driver.vehicles[0]?.vehiclePlate || 'No vehicle'}
                            {driver.currentShift && ` • On Shift: ${driver.currentShift.currentHours?.toFixed(1)}h`}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowBulkAssignMenu(false)
                      setSelectedLoadsForBulk(new Set())
                    }}
                    className="mt-3 w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 450px)' }}>
                {unassignedLoads.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-400">All loads assigned</p>
                  </div>
                ) : (
                  unassignedLoads.map((load) => (
                  <div
                    key={load.id}
                    draggable
                    onDragStart={() => handleDragStart(load)}
                    className={`p-3 border-b border-slate-700/50 hover:bg-slate-800/50 cursor-move transition-colors ${
                      draggedLoad?.id === load.id ? 'bg-slate-800/70 opacity-50' : ''
                    } ${selectedLoadsForBulk.has(load.id) ? 'bg-cyan-500/10 border-cyan-500/30' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedLoadsForBulk.has(load.id)}
                        onChange={() => toggleLoadSelection(load.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 w-4 h-4 rounded border-slate-600/50 bg-slate-800/50 text-cyan-600 focus:ring-cyan-500/50 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm flex items-center gap-2">
                          {load.trackingCode}
                          <span className={`px-2 py-0.5 rounded text-xs ${LOAD_STATUS_COLORS[load.status as keyof typeof LOAD_STATUS_COLORS] || 'bg-slate-700/50 text-slate-300'}`}>
                            {LOAD_STATUS_LABELS[load.status as keyof typeof LOAD_STATUS_LABELS] || load.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{load.shipper}</div>
                        <div className="text-xs text-slate-500 mt-1 truncate">
                          {load.pickup.name} → {load.dropoff.name}
                        </div>
                        {load.readyTime && (
                          <div className="text-xs text-slate-500 mt-1">
                            Ready: {formatDateTime(load.readyTime)}
                          </div>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

