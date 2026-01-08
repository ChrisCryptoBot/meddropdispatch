'use client'

import { useState, useEffect } from 'react'
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
}

export default function ShiftClockWidget({ driverId }: ShiftClockWidgetProps) {
  const [currentShift, setCurrentShift] = useState<CurrentShift | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showOdometerModal, setShowOdometerModal] = useState(false)
  const [odometerReading, setOdometerReading] = useState('')
  const [actionType, setActionType] = useState<'clock-in' | 'clock-out'>('clock-in')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [fetchError, setFetchError] = useState(false)

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

  const handleClockIn = async () => {
    setActionType('clock-in')
    setShowOdometerModal(true)
  }

  const handleClockOut = async () => {
    setActionType('clock-out')
    setShowOdometerModal(true)
  }

  const handleSubmitOdometer = async () => {
    if (!odometerReading || isNaN(Number(odometerReading))) {
      showToast.error('Please enter a valid odometer reading')
      return
    }

    setIsLoading(true)
    try {
      const endpoint = actionType === 'clock-in'
        ? `/api/drivers/${driverId}/shifts/clock-in`
        : `/api/drivers/${driverId}/shifts/clock-out`

      const method = actionType === 'clock-in' ? 'POST' : 'PATCH'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          odometerReading: parseInt(odometerReading),
        }),
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
            localStorage.setItem(`driver_${driverId}_shift`, JSON.stringify(data.shift))
          }
        } else {
          showToast.success(data.message || 'Clocked out successfully')
          setCurrentShift(null)
          localStorage.removeItem(`driver_${driverId}_shift`)
        }
        setShowOdometerModal(false)
        setOdometerReading('')
        await fetchCurrentShift()
      } else {
        const error = await response.json()
        // Don't clear shift on error - preserve state
        showApiError(error, actionType === 'clock-in' ? 'Failed to clock in' : 'Failed to clock out')
      }
    } catch (error) {
      // Don't clear shift on network errors
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
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-green-500/50 transition-all shadow-lg shadow-green-500/30 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Clock In
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
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-red-500/50 transition-all shadow-lg shadow-red-500/30 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Clock Out
            </button>
          </div>
        )}
      </div>

      {/* Odometer Input Modal */}
      {showOdometerModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
          onClick={() => {
            // Only allow closing if not loading and it's not critical (clock out can be cancelled)
            if (!isLoading) {
              setShowOdometerModal(false)
              setOdometerReading('')
            }
          }}
        >
          <div className="glass-primary p-8 rounded-2xl max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">
              {actionType === 'clock-in' ? 'Clock In' : 'Clock Out'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Current Odometer Reading <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={odometerReading}
                  onChange={(e) => setOdometerReading(e.target.value)}
                  placeholder="e.g., 45230"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-white"
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-2">
                  Enter your vehicle's current odometer reading to update mileage tracking.
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowOdometerModal(false)
                  setOdometerReading('')
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 border border-slate-600/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (odometerReading && isNaN(Number(odometerReading))) {
                    showToast.error('Please enter a valid odometer reading')
                    return
                  }
                  // If no odometer provided, proceed without it
                  setIsLoading(true)
                  try {
                    const endpoint = actionType === 'clock-in'
                      ? `/api/drivers/${driverId}/shifts/clock-in`
                      : `/api/drivers/${driverId}/shifts/clock-out`

                    const method = actionType === 'clock-in' ? 'POST' : 'PATCH'

                    const body: any = {}
                    if (odometerReading) {
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
          // Clear shift and localStorage on successful clock out
          setCurrentShift(null)
          localStorage.removeItem(`driver_${driverId}_shift`)
        } else if (actionType === 'clock-in') {
          showToast.success(data.message || 'Clocked in successfully')
          // Store new shift in localStorage
          if (data.shift) {
            localStorage.setItem(`driver_${driverId}_shift`, JSON.stringify(data.shift))
          }
        } else {
          showToast.success(data.message || 'Clocked out successfully')
          // Clear shift on clock out
          setCurrentShift(null)
          localStorage.removeItem(`driver_${driverId}_shift`)
        }
        setShowOdometerModal(false)
        setOdometerReading('')
        await fetchCurrentShift()
      } else {
        const error = await response.json()
        // If clock-out fails, don't clear the shift - keep showing it
        // If clock-in fails, user can try again
        showApiError(error, actionType === 'clock-in' ? 'Failed to clock in' : 'Failed to clock out')
        // Don't clear currentShift on error - preserve the current state
      }
                  } catch (error) {
                    showApiError(error, actionType === 'clock-in' ? 'Failed to clock in' : 'Failed to clock out')
                  } finally {
                    setIsLoading(false)
                  }
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : (actionType === 'clock-in' ? 'Clock In' : 'Clock Out')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

