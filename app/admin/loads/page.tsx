'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { LOAD_STATUS_LABELS, LOAD_STATUS_COLORS } from '@/lib/constants'
import type { LoadStatus } from '@/lib/types'

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
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 font-heading">Load Requests</h1>
          <p className="text-slate-400">Manage and track all courier requests</p>
        </div>
        <Link
          href="/admin/loads/create"
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Load (Phone Request)
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-1">Active Loads</p>
            <p className="text-3xl font-bold text-white font-data">{stats.active}</p>
          </div>
        </div>

        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-1">Completed</p>
            <p className="text-3xl font-bold text-white font-data">{stats.completed}</p>
          </div>
        </div>

        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-1">New Requests</p>
            <p className="text-3xl font-bold text-white font-data">{stats.new}</p>
          </div>
        </div>

        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-1">Total Loads</p>
            <p className="text-3xl font-bold text-white font-data">{stats.total}</p>
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
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <h3 className="text-xl font-bold text-white mb-2">No load requests yet</h3>
                      <p className="text-sm text-slate-400">New requests will appear here</p>
                    </div>
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
