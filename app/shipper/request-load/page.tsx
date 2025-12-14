'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showToast } from '@/lib/toast'

export default function ShipperRequestLoadPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [queuePosition, setQueuePosition] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoiningQueue, setIsJoiningQueue] = useState(false)
  const [callbackId, setCallbackId] = useState<string | null>(null)
  const [callbackStatus, setCallbackStatus] = useState<string | null>(null)
  const [calledAt, setCalledAt] = useState<string | null>(null)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [driver, setDriver] = useState<{ firstName: string; lastName: string } | null>(null)

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    const parsed = JSON.parse(shipperData)
    setShipper(parsed)
    checkQueuePosition(parsed.id)
  }, [router])

  const checkQueuePosition = async (shipperId: string) => {
    try {
      const response = await fetch(`/api/callback-queue?shipperId=${shipperId}`)
      if (response.ok) {
        const data = await response.json()
        // If callback is COMPLETED or CANCELLED, reset to initial state
        if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
          // Reset all state to show initial "Request a Callback" form
          setQueuePosition(null)
          setCallbackId(null)
          setCallbackStatus(null)
          setCalledAt(null)
          setCompletedAt(null)
          setDriver(null)
          return
        }
        
        if (data.inQueue || data.status) {
          setQueuePosition(data.position)
          setCallbackId(data.callbackId)
          setCallbackStatus(data.status)
          setCalledAt(data.calledAt)
          setCompletedAt(data.completedAt)
          setDriver(data.driver)
          
          // Show toast when status changes to CALLED
          if (data.status === 'CALLED' && data.calledAt) {
            const calledTime = new Date(data.calledAt)
            const now = new Date()
            // Only show toast if called within last 30 seconds (to avoid spam)
            if (now.getTime() - calledTime.getTime() < 30000) {
              showToast.success('You\'ve been called!', 'A driver is contacting you now.')
            }
          }
        } else {
          // No callback found, reset all state
          setQueuePosition(null)
          setCallbackId(null)
          setCallbackStatus(null)
          setCalledAt(null)
          setCompletedAt(null)
          setDriver(null)
        }
      }
    } catch (error) {
      console.error('Error checking queue position:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinQueue = async () => {
    if (!shipper) return

    setIsJoiningQueue(true)
    try {
      const response = await fetch('/api/callback-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipperId: shipper.id }),
      })

      if (response.ok) {
        const data = await response.json()
        setQueuePosition(data.position)
        setCallbackId(data.callbackId)
        showToast.success(`You are #${data.position} in the callback queue`)
      } else {
        const error = await response.json()
        showToast.error(error.message || 'Failed to join queue')
      }
    } catch (error) {
      console.error('Error joining queue:', error)
      showToast.error('Failed to join callback queue')
    } finally {
      setIsJoiningQueue(false)
    }
  }

  const handleCancelQueue = async () => {
    if (!callbackId) return

    try {
      const response = await fetch(`/api/callback-queue/${callbackId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setQueuePosition(null)
        setCallbackId(null)
        showToast.success('You have been removed from the callback queue')
      } else {
        showToast.error('Failed to cancel callback request')
      }
    } catch (error) {
      console.error('Error cancelling queue:', error)
      showToast.error('Failed to cancel callback request')
    }
  }

  // Poll for queue position updates - more frequent when called, stop polling when completed
  useEffect(() => {
    if (!shipper) return

    // Don't poll if callback is completed or cancelled - it will reset to initial state
    if (callbackStatus === 'COMPLETED' || callbackStatus === 'CANCELLED') {
      // Check once more to ensure state is reset, then stop polling
      checkQueuePosition(shipper.id)
      return
    }

    if (!callbackId) return

    // Poll more frequently (5 seconds) when called, normal (10 seconds) when pending
    const pollInterval = callbackStatus === 'CALLED' ? 5000 : 10000

    const interval = setInterval(() => {
      checkQueuePosition(shipper.id)
    }, pollInterval)

    return () => clearInterval(interval)
  }, [shipper, callbackId, callbackStatus])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="glass-primary p-8 rounded-2xl text-center max-w-2xl w-full border-2 border-blue-200/30 shadow-glass">
        <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        
        {callbackStatus === 'CALLED' ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">You've Been Called!</h1>
            <div className="glass-primary rounded-2xl p-8 mb-6 border-2 border-yellow-200/30 shadow-glass">
              <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <p className="text-lg text-gray-700 mb-2 font-semibold">A driver is calling you now!</p>
              {driver && (
                <p className="text-sm text-gray-600 mb-4">
                  Driver <span className="font-semibold">{driver.firstName} {driver.lastName}</span> is contacting you.
                </p>
              )}
              {calledAt && (
                <p className="text-xs text-gray-500 mb-6">
                  Called at: {new Date(calledAt).toLocaleString()}
                </p>
              )}
              <p className="text-sm text-gray-700 mb-6">
                Please answer your phone at <span className="font-semibold">{shipper?.phone}</span>. The driver will discuss your load requirements and create your load request.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-yellow-700 mb-4 bg-yellow-50 p-3 rounded-lg">
                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Waiting for call completion...</span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-6">
              <Link
                href="/shipper/dashboard"
                className="inline-block px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Go to Dashboard
              </Link>
            </div>
          </>
        ) : queuePosition !== null ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">You're in the Callback Queue</h1>
            <div className="glass-primary rounded-2xl p-8 mb-6 border-2 border-blue-200/30 shadow-glass">
              <div className="text-6xl font-bold text-gradient mb-4">#{queuePosition}</div>
              <p className="text-lg text-gray-700 mb-2">You are #{queuePosition} in line for a callback</p>
              <p className="text-sm text-gray-600 mb-6">
                Our dispatch team will call you shortly to discuss your load requirements and create your load request.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                <svg className="w-4 h-4 animate-pulse text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Your position updates automatically</span>
              </div>
              <button
                onClick={handleCancelQueue}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all text-sm"
              >
                Cancel Callback Request
              </button>
            </div>
            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600 mb-4">
                Please keep your phone nearby. We'll call you at <span className="font-semibold">{shipper?.phone}</span>
              </p>
              <Link
                href="/shipper/dashboard"
                className="inline-block px-6 py-3 bg-gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-lg"
              >
                Go to Dashboard
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Request a Callback to Book Your Load</h1>
            <p className="text-lg text-gray-700 mb-6">
              Join our callback queue and our dispatch team will call you to discuss your load requirements, negotiate pricing, and create your load request.
            </p>
            
            <div className="glass-primary rounded-2xl p-6 mb-6 border-2 border-blue-200/30 shadow-glass">
              <p className="text-sm text-gray-600 mb-4">
                We'll call you at <span className="font-semibold">{shipper?.phone}</span> when it's your turn.
              </p>
              <button
                onClick={handleJoinQueue}
                disabled={isJoiningQueue}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-primary text-white rounded-lg font-bold text-xl hover:shadow-lg transition-all shadow-lg mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoiningQueue ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Joining Queue...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Join Callback Queue
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500">Available 24/7 for urgent medical courier needs</p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600 mb-4">
                After we call and create your load, you'll receive email notifications and can track it from your dashboard.
              </p>
              <Link
                href="/shipper/dashboard"
                className="inline-block px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Go to Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
