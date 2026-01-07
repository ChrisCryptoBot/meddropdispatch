'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { LOAD_STATUS_LABELS, LOAD_STATUS_COLORS } from '@/lib/constants'
import type { LoadStatus } from '@/lib/types'
import { EmptyStates } from '@/components/ui/EmptyState'
import { showToast, showApiError } from '@/lib/toast'

export default function AdminLoadsPage() {
  const [loads, setLoads] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, new: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLoads, setSelectedLoads] = useState<Set<string>>(new Set())
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  useEffect(() => {
    fetchLoads()
  }, [])

  const fetchLoads = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/loads')
      if (response.ok) {
        const data = await response.json()
        setLoads(data.loads || [])
        setStats(data.stats || { total: 0, active: 0, completed: 0, new: 0 })
      }
    } catch (error) {
      console.error('Error fetching loads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLoads = loads // For now, no filtering

  const handleSelectLoad = (loadId: string) => {
    const newSelected = new Set(selectedLoads)
    if (newSelected.has(loadId)) {
      newSelected.delete(loadId)
    } else {
      newSelected.add(loadId)
    }
    setSelectedLoads(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedLoads.size === filteredLoads.length) {
      setSelectedLoads(new Set())
    } else {
      setSelectedLoads(new Set(filteredLoads.map(l => l.id)))
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedLoads.size === 0) {
      showToast.warning('Please select at least one load')
      return
    }

    setIsBulkProcessing(true)
    try {
      let body: any = {
        loadRequestIds: Array.from(selectedLoads),
        action,
      }

      if (action === 'update_status') {
        body.status = 'CANCELLED'
        body.eventLabel = 'Bulk Cancelled'
      }

      const response = await fetch('/api/load-requests/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to perform bulk action')

      await fetchLoads()
      setSelectedLoads(new Set())
      setShowBulkMenu(false)
      showToast.success(`Bulk ${action} completed successfully!`)
    } catch (error) {
      console.error('Error performing bulk action:', error)
      showApiError(error, 'Failed to perform bulk action')
    } finally {
      setIsBulkProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading loads...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-0 z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 flex items-center justify-between border-b border-slate-700/50">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
            Load Requests
          </h1>
          <p className="text-slate-400">Manage and track all courier requests</p>
        </div>
        <Link
          href="/admin/loads/create"
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Load
        </Link>
      </div>

      {/* Stats - Gold Standard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{stats.active}</p>
            <p className="text-sm text-slate-400 font-medium">Active Loads</p>
          </div>
        </div>

        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-green-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{stats.completed}</p>
            <p className="text-sm text-slate-400 font-medium">Completed</p>
          </div>
        </div>

        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-amber-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{stats.new}</p>
            <p className="text-sm text-slate-400 font-medium">New Requests</p>
          </div>
        </div>

        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{stats.total}</p>
            <p className="text-sm text-slate-400 font-medium">Total Loads</p>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLoads.size > 0 && (
        <div className="glass-primary p-4 rounded-xl mb-6 border border-cyan-500/50 shadow-lg bg-cyan-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-white font-semibold">{selectedLoads.size} load(s) selected</span>
              <button
                onClick={handleSelectAll}
                className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
              >
                {selectedLoads.size === filteredLoads.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                disabled={isBulkProcessing}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50"
              >
                Bulk Actions ▼
              </button>
              {showBulkMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowBulkMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-lg shadow-xl z-50 border border-slate-700/50 overflow-hidden">
                    <button
                      onClick={() => handleBulkAction('update_status')}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
                    >
                      Cancel Selected
                    </button>
                    <button
                      onClick={() => handleBulkAction('generate_invoices')}
                      className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-green-900/20 transition-colors"
                    >
                      Generate Invoices
                    </button>
                    <button
                      onClick={() => handleBulkAction('export_csv')}
                      className="w-full px-4 py-2 text-left text-sm text-cyan-400 hover:bg-cyan-900/20 transition-colors"
                    >
                      Export CSV
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loads Table */}
      <div className="glass-primary rounded-xl overflow-hidden border border-slate-700/50 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedLoads.size === filteredLoads.length && filteredLoads.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-600/50 bg-slate-800/50 text-cyan-600 focus:ring-cyan-500/50"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Tracking Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Shipper
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Quote
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredLoads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <EmptyStates.NoLoads
                      title="No Load Requests"
                      description="New load requests will appear here when they are created."
                      action={{
                        label: "Create Load",
                        href: "/admin/loads/create"
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredLoads.map((load) => (
                  <tr key={load.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLoads.has(load.id)}
                        onChange={() => handleSelectLoad(load.id)}
                        className="w-4 h-4 rounded border-slate-600/50 bg-slate-800/50 text-cyan-600 focus:ring-cyan-500/50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/loads/${load.id}`}
                        className="font-mono font-semibold text-cyan-400 hover:text-cyan-300 font-data"
                      >
                        {load.publicTrackingCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{load.shipper.companyName}</div>
                      <div className="text-xs text-slate-400">{load.shipper.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-300">
                        {load.serviceType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300">
                        {load.pickupFacility.city}, {load.pickupFacility.state}
                        <span className="text-slate-500 mx-2">→</span>
                        {load.dropoffFacility.city}, {load.dropoffFacility.state}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${LOAD_STATUS_COLORS[load.status as LoadStatus]}`}>
                        {LOAD_STATUS_LABELS[load.status as LoadStatus]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {load.quoteAmount ? (
                        <span className="text-sm font-semibold text-white font-data">
                          ${load.quoteAmount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDateTime(load.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/loads/${load.id}`}
                        className="text-cyan-400 hover:text-cyan-300 font-medium text-sm"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
