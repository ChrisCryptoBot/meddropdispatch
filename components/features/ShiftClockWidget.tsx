'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { showToast, showApiError } from '@/lib/toast'

interface ShiftClockWidgetProps {
  driverId: string
}

interface CurrentShift {
  id: string
  clockIn: string
  clockOut: string | null
  totalHours: number | null
  currentHours: number
  vehicleId?: string | null
}

interface Vehicle {
  id: string
  vehicleType: string
  vehicleMake?: string | null
  vehicleModel?: string | null
  vehiclePlate: string
  nickname?: string | null
  vehicleNumber?: string | null
  isActive: boolean
}

export default function ShiftClockWidget({ driverId }: ShiftClockWidgetProps) {
  const [currentShift, setCurrentShift] = useState<CurrentShift | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [fetchError, setFetchError] = useState(false)
  const [showOdometerModal, setShowOdometerModal] = useState(false)
  const [odometerReading, setOdometerReading] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false)
  const [showVehicleSelector, setShowVehicleSelector] = useState(false)
  const [actionType, setActionType] = useState<'clock-in' | 'clock-out'>('clock-in')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load shift from localStorage on mount (backup if API fails)
  useEffect(() => {
    const storedShift = localStorage.getItem(`driver_${driverId}_shift`)
    if (storedShift) {
      try {
        const parsed = JSON.parse(storedShift)
        // Only use stored shift if it's recent (within last 24 hours)
        const clockInTime = new Date(parsed.clockIn).getTime()
        const now = Date.now()
        const hoursSinceClockIn = (now - clockInTime) / (1000 * 60 * 60)
        if (hoursSinceClockIn < 24 && !parsed.clockOut) {
          setCurrentShift(parsed)
        } else {
          localStorage.removeItem(`driver_${driverId}_shift`)
        }
      } catch (e) {
        // Invalid stored data, remove it
        localStorage.removeItem(`driver_${driverId}_shift`)
      }
    }
  }, [driverId])

  // Fetch current shift status
  useEffect(() => {
    fetchCurrentShift()
    // Poll every 30 seconds to update current hours from server
    const interval = setInterval(fetchCurrentShift, 30000)
    return () => clearInterval(interval)
  }, [driverId])

  // Fetch vehicles when modal opens
  useEffect(() => {
    if (showOdometerModal) {
      if (actionType === 'clock-in') {
        // For clock-in, fetch all active vehicles for selection
        fetchVehicles()
      } else if (actionType === 'clock-out' && currentShift?.vehicleId) {
        // For clock-out, fetch vehicles to display the vehicle name, and pre-select the shift vehicle
        fetchVehicles()
        setSelectedVehicleId(currentShift.vehicleId)
      }
    }
  }, [showOdometerModal, actionType, currentShift])

  const fetchVehicles = async () => {
    setIsLoadingVehicles(true)
    try {
      const response = await fetch(`/api/drivers/${driverId}/vehicles`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const activeVehicles = (data.vehicles || []).filter((v: Vehicle) => v.isActive)
        setVehicles(activeVehicles)
        // Auto-select first vehicle if only one available
        if (activeVehicles.length === 1) {
          setSelectedVehicleId(activeVehicles[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error)
    } finally {
      setIsLoadingVehicles(false)
    }
  }

  // Live timer that updates every second when clocked in
  useEffect(() => {
    if (!currentShift) {
      setElapsedTime(0)
      return
    }

    // Calculate initial elapsed time from clock in
    const calculateElapsed = () => {
      const clockInTime = new Date(currentShift.clockIn).getTime()
      const now = Date.now()
      return Math.floor((now - clockInTime) / 1000) // seconds
    }

    setElapsedTime(calculateElapsed())

    // Update every second
    const timer = setInterval(() => {
      setElapsedTime(calculateElapsed())
    }, 1000)

    return () => clearInterval(timer)
  }, [currentShift])

  const fetchCurrentShift = async () => {
    try {
      setFetchError(false)
      const response = await fetch(`/api/drivers/${driverId}/shifts/current`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const shift = data.shift || null
        
        // Update localStorage backup
        if (shift && !shift.clockOut) {
          localStorage.setItem(`driver_${driverId}_shift`, JSON.stringify(shift))
        } else {
          localStorage.removeItem(`driver_${driverId}_shift`)
        }
        
        // Only update if we got a valid response (don't clear on network errors)
        setCurrentShift(shift)
      } else if (response.status === 401) {
        // Session expired - but keep showing shift if we have one (user might still be clocked in)
        // Don't clear the shift on auth errors
        console.warn('Session expired, but keeping shift display')
      }
    } catch (error) {
      console.error('Error fetching shift status:', error)
      setFetchError(true)
      // Don't clear currentShift on network errors - keep showing what we have
      // The shift state persists from localStorage or previous successful fetch
    }
  }

  const handleClockIn = () => {
    // Show odometer modal (time is captured automatically by server)
    setActionType('clock-in')
    setOdometerReading('')
    setSelectedVehicleId('')
    setShowOdometerModal(true)
  }

  const handleClockOut = () => {
    // Show odometer modal (time is captured automatically by server)
    setActionType('clock-out')
    setOdometerReading('')
    // Pre-select the vehicle from the shift
    if (currentShift?.vehicleId) {
      setSelectedVehicleId(currentShift.vehicleId)
    }
    setShowOdometerModal(true)
  }

  const closeModal = () => {
    if (!isLoading) {
      setShowOdometerModal(false)
      setShowVehicleSelector(false)
      setOdometerReading('')
      setSelectedVehicleId('')
    }
  }

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId)
    setShowVehicleSelector(false)
  }

  const handleSubmitOdometer = async () => {
    // Validate vehicle selection for clock-in (required)
    if (actionType === 'clock-in' && !selectedVehicleId) {
      showToast.error('Please select a vehicle')
      return
    }

    // Validate odometer if provided (it's optional)
    if (odometerReading && isNaN(Number(odometerReading))) {
      showToast.error('Please enter a valid odometer reading or leave it blank')
      return
    }

    setIsLoading(true)
    try {
      const endpoint = actionType === 'clock-in'
        ? `/api/drivers/${driverId}/shifts/clock-in`
        : `/api/drivers/${driverId}/shifts/clock-out`

      const method = actionType === 'clock-in' ? 'POST' : 'PATCH'

      const body: any = {
        vehicleId: actionType === 'clock-in' ? selectedVehicleId : (selectedVehicleId || currentShift?.vehicleId),
      }
      if (odometerReading && odometerReading.trim() !== '') {
        body.odometerReading = parseInt(odometerReading)
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const data = await response.json()
        if (actionType === 'clock-out' && data.shift?.totalHours) {
          const hours = Math.floor(data.shift.totalHours)
          const minutes = Math.floor((data.shift.totalHours - hours) * 60)
          const timeWorked = hours > 0 
            ? `${hours}h ${minutes}m` 
            : `${minutes}m`
          showToast.success(`Clocked out successfully. Time worked: ${timeWorked}`)
          setCurrentShift(null)
          localStorage.removeItem(`driver_${driverId}_shift`)
        } else if (actionType === 'clock-in') {
          showToast.success(data.message || 'Clocked in successfully')
          if (data.shift) {
            // Immediately update UI with the new shift data (no waiting for refetch)
            const shiftData: CurrentShift = {
              id: data.shift.id,
              clockIn: typeof data.shift.clockIn === 'string' 
                ? data.shift.clockIn 
                : data.shift.clockIn.toISOString(),
              clockOut: data.shift.clockOut 
                ? (typeof data.shift.clockOut === 'string' 
                    ? data.shift.clockOut 
                    : data.shift.clockOut.toISOString())
                : null,
              totalHours: data.shift.totalHours || null,
              currentHours: 0, // Will be calculated by the timer
            }
            setCurrentShift(shiftData)
            localStorage.setItem(`driver_${driverId}_shift`, JSON.stringify(shiftData))
          }
        } else {
          showToast.success(data.message || 'Clocked out successfully')
          setCurrentShift(null)
          localStorage.removeItem(`driver_${driverId}_shift`)
        }
        setShowOdometerModal(false)
        setOdometerReading('')
        // Fetch in background to ensure sync, but don't wait for it (UI already updated)
        fetchCurrentShift().catch(err => console.error('Background fetch error:', err))
      } else {
        const error = await response.json()
        showApiError(error, actionType === 'clock-in' ? 'Failed to clock in' : 'Failed to clock out')
      }
    } catch (error) {
      showApiError(error, actionType === 'clock-in' ? 'Failed to clock in' : 'Failed to clock out')
    } finally {
      setIsLoading(false)
    }
  }


  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {!currentShift ? (
          <button
            onClick={handleClockIn}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-green-500/50 transition-all shadow-lg shadow-green-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Clocking In...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Clock In
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 bg-slate-800/50 rounded-lg border border-green-500/30">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="text-xs text-slate-400">On Shift</div>
                {fetchError && (
                  <div className="text-xs text-yellow-400" title="Unable to sync with server, showing cached shift">
                    ⚠
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-500">{formatTime(currentShift.clockIn)}</div>
                <div className="text-2xl font-mono font-bold text-green-400 tracking-wider">
                  {formatElapsedTime(elapsedTime)}
                </div>
              </div>
            </div>
            <button
              onClick={handleClockOut}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-red-500/50 transition-all shadow-lg shadow-red-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Clocking Out...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Clock Out
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Clock In/Out Modal - Centered - Portal to body */}
      {showOdometerModal && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" 
          onClick={closeModal}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div 
            className="glass-primary rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X Button */}
            <button
              onClick={closeModal}
              disabled={isLoading}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
              title="Close"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-700/50">
              <h2 className="text-2xl font-bold text-white pr-8">
                {actionType === 'clock-in' ? 'Clock In' : 'Clock Out'}
              </h2>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-5">
              {/* Vehicle Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Vehicle {actionType === 'clock-in' && <span className="text-urgent-500">*</span>}
                </label>
                
                {actionType === 'clock-in' ? (
                  isLoadingVehicles ? (
                    <div className="w-full px-4 py-3 rounded-lg border border-slate-600/50 bg-slate-800/50 text-slate-400 text-center">
                      Loading vehicles...
                    </div>
                  ) : vehicles.length === 0 ? (
                    <div className="w-full px-4 py-3 rounded-lg border border-urgent-500/50 bg-urgent-500/10 text-urgent-400 text-sm">
                      No active vehicles found. Please add a vehicle in your vehicle settings first.
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowVehicleSelector(true)}
                        disabled={isLoading || isLoadingVehicles}
                        className="w-full px-4 py-3 rounded-lg border border-slate-600/50 bg-slate-800/50 text-left flex items-center justify-between hover:border-cyan-500/50 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className={selectedVehicleId ? 'text-white font-medium' : 'text-slate-400'}>
                          {selectedVehicleId 
                            ? (() => {
                                const vehicle = vehicles.find(v => v.id === selectedVehicleId)
                                return vehicle 
                                  ? (vehicle.vehicleNumber || vehicle.nickname || vehicle.vehiclePlate)
                                  : 'Select a vehicle...'
                              })()
                            : 'Select a vehicle...'}
                        </span>
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {selectedVehicleId && (() => {
                        const vehicle = vehicles.find(v => v.id === selectedVehicleId)
                        return vehicle?.vehiclePlate && (vehicle.vehicleNumber || vehicle.nickname) ? (
                          <p className="text-xs text-slate-500 mt-2 ml-1">
                            Plate: {vehicle.vehiclePlate}
                          </p>
                        ) : null
                      })()}
                    </>
                  )
                ) : (
                  <div className="w-full px-4 py-3 rounded-lg border border-slate-600/50 bg-slate-700/30 text-slate-300">
                    {(() => {
                      const vehicle = vehicles.find(v => v.id === selectedVehicleId)
                      return vehicle 
                        ? (vehicle.vehicleNumber || vehicle.nickname || vehicle.vehiclePlate || 'Vehicle')
                        : 'Vehicle'
                    })()}
                  </div>
                )}
              </div>

              {/* Odometer Reading */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Odometer Reading <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={odometerReading}
                  onChange={(e) => setOdometerReading(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading && !(actionType === 'clock-in' && !selectedVehicleId)) {
                      handleSubmitOdometer()
                    }
                  }}
                  placeholder="Enter mileage (e.g., 45230)"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-white placeholder:text-slate-500"
                  autoFocus={actionType === 'clock-out'}
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-400 mt-2">
                  Current mileage on the odometer. Time is captured automatically.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3">
              <button
                onClick={closeModal}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOdometer}
                disabled={isLoading || (actionType === 'clock-in' && !selectedVehicleId) || isLoadingVehicles}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </span>
                ) : (
                  actionType === 'clock-in' ? 'Clock In' : 'Clock Out'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Vehicle Selector Modal - Centered - Portal to body */}
      {showVehicleSelector && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" 
          onClick={() => setShowVehicleSelector(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div 
            className="glass-primary rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-lg relative max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X Button */}
            <button
              onClick={() => setShowVehicleSelector(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors z-10"
              title="Close"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-700/50">
              <h3 className="text-xl font-bold text-white pr-8">
                Select Vehicle
              </h3>
            </div>
            
            {/* Vehicle List - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {vehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => handleVehicleSelect(vehicle.id)}
                  className={`w-full px-4 py-4 rounded-lg border text-left transition-all ${
                    selectedVehicleId === vehicle.id
                      ? 'bg-cyan-600/20 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500/50'
                  }`}
                >
                  <div className={`font-semibold ${selectedVehicleId === vehicle.id ? 'text-white' : 'text-slate-200'}`}>
                    {vehicle.vehicleNumber || vehicle.nickname || vehicle.vehiclePlate}
                  </div>
                  {vehicle.vehiclePlate && (vehicle.vehicleNumber || vehicle.nickname) && (
                    <div className="text-sm text-slate-400 mt-1">
                      Plate: {vehicle.vehiclePlate}
                    </div>
                  )}
                  {vehicle.vehicleMake && vehicle.vehicleModel && (
                    <div className="text-xs text-slate-500 mt-1">
                      {vehicle.vehicleMake} {vehicle.vehicleModel}{vehicle.vehicleYear && ` • ${vehicle.vehicleYear}`}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-700/50">
              <button
                onClick={() => setShowVehicleSelector(false)}
                className="w-full px-4 py-2.5 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

