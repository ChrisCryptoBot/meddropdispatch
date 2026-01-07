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

  // Fetch current shift status
  useEffect(() => {
    fetchCurrentShift()
    // Poll every 30 seconds to update current hours
    const interval = setInterval(fetchCurrentShift, 30000)
    return () => clearInterval(interval)
  }, [driverId])

  const fetchCurrentShift = async () => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/shifts/current`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setCurrentShift(data.currentShift)
      }
    } catch (error) {
      console.error('Error fetching shift status:', error)
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
        showToast.success(data.message || (actionType === 'clock-in' ? 'Clocked in successfully' : 'Clocked out successfully'))
        setShowOdometerModal(false)
        setOdometerReading('')
        await fetchCurrentShift()
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
          <div className="flex items-center gap-2">
            <div className="px-3 py-2 bg-slate-800/50 rounded-lg border border-green-500/30">
              <div className="text-xs text-slate-400">On Shift</div>
              <div className="text-sm font-semibold text-green-400">
                {formatTime(currentShift.clockIn)} - {formatHours(currentShift.currentHours)}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowOdometerModal(false)}>
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
                      showToast.success(data.message || (actionType === 'clock-in' ? 'Clocked in successfully' : 'Clocked out successfully'))
                      setShowOdometerModal(false)
                      setOdometerReading('')
                      await fetchCurrentShift()
                    } else {
                      const error = await response.json()
                      showApiError(error, actionType === 'clock-in' ? 'Failed to clock in' : 'Failed to clock out')
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

