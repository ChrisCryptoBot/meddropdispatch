'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/lib/toast'

interface CallbackQueueItem {
  id: string
  position: number
  status: string
  calledAt: string | null
  completedAt: string | null
  notes: string | null
  createdAt: string
  priority?: string
  loadRequestId?: string | null
  loadRequest?: {
    id: string
    publicTrackingCode: string
    status: string
  } | null
  shipper: {
    id: string
    companyName: string
    contactName: string
    phone: string
    email: string
  }
  driver?: {
    id: string
    firstName: string
    lastName: string
  } | null
}

export default function DriverCallbackQueuePage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [callbacks, setCallbacks] = useState<CallbackQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [markingAsCalled, setMarkingAsCalled] = useState<string | null>(null)
  const [notes, setNotes] = useState<{ [key: string]: string }>({})
  const [filterStatus, setFilterStatus] = useState<'all' | 'PENDING' | 'CALLED' | 'COMPLETED'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'position' | 'created' | 'company'>('position')
  const [showHistory, setShowHistory] = useState(false)
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [selectedCallbacks, setSelectedCallbacks] = useState<Set<string>>(new Set())
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [priorityUpdates, setPriorityUpdates] = useState<{ [key: string]: string }>({})
  const [deletingCallbackId, setDeletingCallbackId] = useState<string | null>(null)

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
        fetchCallbacks()
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  const fetchCallbacks = async () => {
    try {
      const response = await fetch('/api/callback-queue')
      if (response.ok) {
        const data = await response.json()
        setCallbacks(data.callbacks || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to load callback queue:', errorData)
        showToast.error(errorData.message || errorData.error || 'Failed to load callback queue')
      }
    } catch (error) {
      console.error('Error fetching callbacks:', error)
      showToast.error('Failed to load callback queue. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsCalled = async (callbackId: string) => {
    if (!driver) return

    setMarkingAsCalled(callbackId)
    try {
      const response = await fetch(`/api/callback-queue/${callbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CALLED',
          driverId: driver.id,
          notes: notes[callbackId] || null,
        }),
      })

      if (response.ok) {
        showToast.success('Callback marked as called')
        setNotes({ ...notes, [callbackId]: '' })
        fetchCallbacks() // Refresh queue
        // Notify layout to refresh callback count
        window.dispatchEvent(new CustomEvent('callbackQueueUpdated'))
      } else {
        const error = await response.json()
        showToast.error(error.message || 'Failed to mark as called')
      }
    } catch (error) {
      console.error('Error marking as called:', error)
      showToast.error('Failed to mark as called')
    } finally {
      setMarkingAsCalled(null)
    }
  }

  const handleMarkAsCompleted = async (callbackId: string) => {
    if (!driver) return

    setMarkingAsCalled(callbackId)
    try {
      const response = await fetch(`/api/callback-queue/${callbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          driverId: driver.id,
          notes: notes[callbackId] || null,
        }),
      })

      if (response.ok) {
        showToast.success('Callback marked as completed')
        setNotes({ ...notes, [callbackId]: '' })
        fetchCallbacks() // Refresh queue
        // Notify layout to refresh callback count
        window.dispatchEvent(new CustomEvent('callbackQueueUpdated'))
      } else {
        const error = await response.json()
        showToast.error(error.message || 'Failed to mark as completed')
      }
    } catch (error) {
      console.error('Error marking as completed:', error)
      showToast.error('Failed to mark as completed')
    } finally {
      setMarkingAsCalled(null)
    }
  }

  const handleBulkAction = async (action: 'CALLED' | 'COMPLETED') => {
    if (!driver || selectedCallbacks.size === 0) return

    setIsBulkProcessing(true)
    try {
      const response = await fetch('/api/callback-queue/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callbackIds: Array.from(selectedCallbacks),
          status: action,
          driverId: driver.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        showToast.success(`Successfully ${action === 'CALLED' ? 'marked as called' : 'marked as completed'} ${data.updated} callback(s)`)
        setSelectedCallbacks(new Set())
        fetchCallbacks()
        window.dispatchEvent(new CustomEvent('callbackQueueUpdated'))
      } else {
        const error = await response.json()
        showToast.error(error.message || 'Failed to perform bulk action')
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
      showToast.error('Failed to perform bulk action')
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleUpdatePriority = async (callbackId: string, priority: string) => {
    try {
      const response = await fetch(`/api/callback-queue/${callbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: callbacks.find(c => c.id === callbackId)?.status || 'PENDING',
          priority,
        }),
      })

      if (response.ok) {
        setPriorityUpdates({ ...priorityUpdates, [callbackId]: priority })
        fetchCallbacks()
      } else {
        const error = await response.json()
        showToast.error(error.message || 'Failed to update priority')
      }
    } catch (error) {
      console.error('Error updating priority:', error)
      showToast.error('Failed to update priority')
    }
  }

  const handleReassign = async (callbackId: string, unassign: boolean = true) => {
    try {
      const response = await fetch(`/api/callback-queue/${callbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: callbacks.find(c => c.id === callbackId)?.status || 'PENDING',
          reassign: unassign ? null : true,
        }),
      })

      if (response.ok) {
        showToast.success('Callback reassigned')
        fetchCallbacks()
      } else {
        const error = await response.json()
        showToast.error(error.message || 'Failed to reassign callback')
      }
    } catch (error) {
      console.error('Error reassigning callback:', error)
      showToast.error('Failed to reassign callback')
    }
  }

  const toggleSelectCallback = (callbackId: string) => {
    const newSelected = new Set(selectedCallbacks)
    if (newSelected.has(callbackId)) {
      newSelected.delete(callbackId)
    } else {
      newSelected.add(callbackId)
    }
    setSelectedCallbacks(newSelected)
  }

  const toggleSelectAll = () => {
    const pendingIds = pendingCallbacks.map(c => c.id)
    if (pendingIds.every(id => selectedCallbacks.has(id))) {
      setSelectedCallbacks(new Set())
    } else {
      setSelectedCallbacks(new Set(pendingIds))
    }
  }

  const handleDeleteCallback = async (callbackId: string) => {
    if (!confirm('Are you sure you want to delete this completed callback? This action cannot be undone.')) {
      return
    }

    setDeletingCallbackId(callbackId)
    try {
      const response = await fetch(`/api/callback-queue/${callbackId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        showToast.success('Callback deleted')
        fetchCallbacks() // Refresh queue
        window.dispatchEvent(new CustomEvent('callbackQueueUpdated'))
      } else {
        const error = await response.json()
        showToast.error(error.message || 'Failed to delete callback')
      }
    } catch (error) {
      console.error('Error deleting callback:', error)
      showToast.error('Failed to delete callback')
    } finally {
      setDeletingCallbackId(null)
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500/20 text-red-300 border-red-500/50'
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50'
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50'
    }
  }

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!driver) return

    const interval = setInterval(() => {
      fetchCallbacks()
    }, 10000)

    return () => clearInterval(interval)
  }, [driver])

  // Filter and sort callbacks
  const filteredCallbacks = callbacks.filter((c) => {
    // Status filter
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        c.shipper.companyName.toLowerCase().includes(query) ||
        c.shipper.contactName.toLowerCase().includes(query) ||
        c.shipper.email.toLowerCase().includes(query) ||
        c.shipper.phone.includes(query)
      )
    }
    
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case 'position':
        return a.position - b.position
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'company':
        return a.shipper.companyName.localeCompare(b.shipper.companyName)
      default:
        return 0
    }
  })

  const pendingCallbacks = filteredCallbacks.filter(c => c.status === 'PENDING')
  const calledCallbacks = filteredCallbacks.filter(c => c.status === 'CALLED')
  const completedCallbacks = filteredCallbacks.filter(c => c.status === 'COMPLETED')

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading callback queue...</p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate time since callback was created (for pending alerts)
  const getTimeSinceCreated = (createdAt: string): { hours: number; minutes: number; isUrgent: boolean } => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return {
      hours: diffHours,
      minutes: diffMinutes,
      isUrgent: diffHours >= 1, // Urgent if pending for 1+ hour
    }
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Callback Queue
        </h1>
        <p className="text-slate-400">
          Manage shipper callback requests. Mark callbacks as "called" when you contact the shipper, and "completed" when the load is created.
        </p>
      </div>

      {/* Filters and Search - Separate, scrolls with page */}
      <div className="glass-primary p-6 rounded-xl mb-6 border border-slate-700/50 shadow-lg">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company, name, email, phone..."
                className="w-full px-4 py-3 pl-10 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
              />
              <svg className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CALLED">Called</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            >
              <option value="position">Position (Queue Order)</option>
              <option value="created">Newest First</option>
              <option value="company">Company Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
          <div className="text-3xl font-bold text-white font-data mb-1">{pendingCallbacks.length}</div>
          <div className="text-sm text-slate-400 font-medium">Pending Callbacks</div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
          <div className="text-3xl font-bold text-white font-data mb-1">{calledCallbacks.length}</div>
          <div className="text-sm text-slate-400 font-medium">Called (In Progress)</div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
          <div className="text-3xl font-bold text-white font-data mb-1">{completedCallbacks.length}</div>
          <div className="text-sm text-slate-400 font-medium">Completed Today</div>
        </div>
      </div>

      {/* Pending Callbacks */}
      {pendingCallbacks.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Pending Callbacks</h2>
            {selectedCallbacks.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">{selectedCallbacks.size} selected</span>
                <button
                  onClick={() => handleBulkAction('CALLED')}
                  disabled={isBulkProcessing}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isBulkProcessing ? 'Processing...' : 'Mark Selected as Called'}
                </button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            {pendingCallbacks.map((callback) => {
              const timeInfo = getTimeSinceCreated(callback.createdAt)
              const priority = priorityUpdates[callback.id] || callback.priority || 'NORMAL'
              const isSelected = selectedCallbacks.has(callback.id)
              return (
              <div
                key={callback.id}
                className={`glass-primary rounded-xl p-5 border shadow-lg ${
                  timeInfo.isUrgent || priority === 'URGENT'
                    ? 'border-red-500/50 bg-red-900/20' 
                    : priority === 'HIGH'
                    ? 'border-orange-500/50 bg-orange-900/20'
                    : 'border-slate-700/50'
                } ${isSelected ? 'ring-2 ring-cyan-500/50' : ''} hover:border-cyan-500/50 transition-all`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectCallback(callback.id)}
                    className="mt-1 w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500"
                  />
                  <div className="flex-1">
                    {(timeInfo.isUrgent || priority === 'URGENT' || priority === 'HIGH') && (
                      <div className="mb-4 p-3 bg-red-900/30 border-2 border-red-500/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-sm font-semibold text-red-300">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {priority === 'URGENT' ? 'Urgent Priority' : priority === 'HIGH' ? 'High Priority' : 'Urgent'}: Pending for {timeInfo.hours > 0 ? `${timeInfo.hours}h ${timeInfo.minutes}m` : `${timeInfo.minutes}m`}
                              </span>
                            </p>
                          </div>
                          <select
                            value={priority}
                            onChange={(e) => handleUpdatePriority(callback.id, e.target.value)}
                            className="px-3 py-1 text-sm rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-lg flex items-center justify-center text-white font-bold text-xl font-data">
                            #{callback.position}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-bold text-white">{callback.shipper.companyName}</h3>
                              {priority !== 'NORMAL' && !timeInfo.isUrgent && (
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(priority)}`}>
                                  {priority}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-300">{callback.shipper.contactName}</p>
                            {!timeInfo.isUrgent && priority === 'NORMAL' && (
                              <p className="text-xs text-slate-400 mt-1">
                                Waiting {timeInfo.hours > 0 ? `${timeInfo.hours}h ${timeInfo.minutes}m` : `${timeInfo.minutes}m`}
                              </p>
                            )}
                            {priority === 'NORMAL' && !timeInfo.isUrgent && (
                              <select
                                value={priority}
                                onChange={(e) => handleUpdatePriority(callback.id, e.target.value)}
                                className="mt-1 px-2 py-1 text-xs rounded border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                              </select>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-slate-300 mb-1">Phone</p>
                        <a
                          href={`tel:${callback.shipper.phone}`}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {callback.shipper.phone}
                        </a>
                      </div>
                      <div>
                        <p className="text-sm text-slate-300 mb-1">Email</p>
                        <a
                          href={`mailto:${callback.shipper.email}`}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold"
                        >
                          {callback.shipper.email}
                        </a>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-slate-300 mb-1">Requested At</p>
                      <p className="text-white">
                        {new Date(callback.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </p>
                    </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes[callback.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [callback.id]: e.target.value })}
                      placeholder="Add notes about the callback..."
                      className="w-full px-4 py-2 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => handleMarkAsCalled(callback.id)}
                      disabled={markingAsCalled === callback.id}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {markingAsCalled === callback.id ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Marking...
                        </span>
                      ) : (
                        'Mark as Called'
                      )}
                    </button>
                    {callback.driver && (
                      <button
                        onClick={() => handleReassign(callback.id, true)}
                        className="px-4 py-2 bg-slate-700/50 text-slate-200 font-semibold rounded-lg hover:bg-slate-700 transition-all border border-slate-600/50 text-sm"
                      >
                        Reassign
                      </button>
                    )}
                    <a
                      href={`/driver/manual-load?callbackId=${callback.id}&shipperId=${callback.shipper.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-semibold rounded-lg hover:from-cyan-700 hover:to-cyan-800 transition-all text-sm"
                    >
                      Create Load →
                    </a>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="glass-primary rounded-xl p-12 text-center border border-slate-700/50 shadow-lg mb-6">
          <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">No Pending Callbacks</h3>
          <p className="text-slate-400">All shippers have been called. Check back later for new requests.</p>
        </div>
      )}

      {/* Called Callbacks (In Progress) */}
      {calledCallbacks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Called (In Progress)</h2>
          <div className="space-y-4">
            {calledCallbacks.map((callback) => (
              <div
                key={callback.id}
                className="glass-primary rounded-xl p-5 border border-yellow-500/50 shadow-lg hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                        ✓
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{callback.shipper.companyName}</h3>
                        <p className="text-sm text-slate-300">{callback.shipper.contactName}</p>
                      </div>
                    </div>
                    {callback.calledAt && (
                      <p className="text-sm text-slate-300 mt-2">
                        Called at: {new Date(callback.calledAt).toLocaleString()}
                      </p>
                    )}
                    {callback.notes && (
                      <div className="mt-3 p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
                        <p className="text-sm text-slate-300">{callback.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes[callback.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [callback.id]: e.target.value })}
                      placeholder="Add notes about the callback..."
                      className="w-full px-4 py-2 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      rows={2}
                    />
                  </div>
                  <button
                    onClick={() => handleMarkAsCompleted(callback.id)}
                    disabled={markingAsCalled === callback.id}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {markingAsCalled === callback.id ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Marking...
                      </span>
                    ) : (
                      'Mark as Completed'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Callbacks */}
      {completedCallbacks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Completed Callbacks</h2>
          <div className="space-y-4">
            {completedCallbacks.map((callback) => (
              <div
                key={callback.id}
                className="glass-primary rounded-xl p-5 border border-green-500/50 shadow-lg bg-green-900/20 relative hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                        ✓
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{callback.shipper.companyName}</h3>
                        <p className="text-sm text-slate-300">{callback.shipper.contactName}</p>
                      </div>
                    </div>
                    {callback.calledAt && (
                      <p className="text-sm text-slate-300 mt-2">
                        Called at: {new Date(callback.calledAt).toLocaleString()}
                      </p>
                    )}
                    {callback.completedAt && (
                      <p className="text-sm text-slate-300 mt-1">
                        Completed at: {new Date(callback.completedAt).toLocaleString()}
                      </p>
                    )}
                    {callback.loadRequest && (
                      <div className="mt-4 p-4 bg-green-900/30 border-2 border-green-500/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm font-semibold text-green-300">Load Created</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-300">
                            <span className="font-semibold">Tracking Code:</span>{' '}
                            <span className="font-mono text-cyan-400">{callback.loadRequest.publicTrackingCode}</span>
                          </p>
                          <p className="text-sm text-slate-300">
                            <span className="font-semibold">Status:</span>{' '}
                            <span className="capitalize">{callback.loadRequest.status.toLowerCase().replace('_', ' ')}</span>
                          </p>
                          <a
                            href={`/driver/loads/${callback.loadRequest.id}`}
                            className="inline-block mt-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all text-sm"
                          >
                            View Load Details →
                          </a>
                        </div>
                      </div>
                    )}
                    {callback.notes && (
                      <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <p className="text-sm text-slate-300">
                          <span className="font-semibold">Notes:</span> {callback.notes}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2 mr-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDeleteCallback(callback.id)
                      }}
                      disabled={deletingCallbackId === callback.id}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete callback"
                      aria-label="Delete completed callback"
                    >
                      {deletingCallbackId === callback.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

