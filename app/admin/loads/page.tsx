'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { LOAD_STATUS_LABELS, LOAD_STATUS_COLORS } from '@/lib/constants'
import type { LoadStatus } from '@/lib/types'
import { EmptyStates } from '@/components/ui/EmptyState'

export default function AdminLoadsPage() {
  const [loads, setLoads] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, new: 0 })
  const [isLoading, setIsLoading] = useState(true)

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
    <div className="p-6 md:p-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 pb-2 flex items-center justify-between">
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

      {/* Loads Table */}
      <div className="glass-primary rounded-xl overflow-hidden border border-slate-700/50 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
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
                  <td colSpan={8} className="px-6 py-12 text-center">
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
