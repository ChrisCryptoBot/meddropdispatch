'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { showToast, showApiError } from '@/lib/toast'
import { EmptyState } from '@/components/ui/EmptyState'

interface Shipper {
  id: string
  companyName: string
  clientType: string
  contactName: string
  email: string
  phone: string
  isActive: boolean
  createdAt: string
  _count: {
    facilities: number
    loadRequests: number
  }
}

export default function ShippersPage() {
  const [shippers, setShippers] = useState<Shipper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchShippers()
  }, [])

  const fetchShippers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/shippers')
      if (!response.ok) throw new Error('Failed to fetch shippers')
      const data = await response.json()
      setShippers(data.shippers || [])
    } catch (error) {
      console.error('Error fetching shippers:', error)
      showApiError(error, 'Failed to load shippers')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (shipperId: string) => {
    const shipper = shippers.find(s => s.id === shipperId)
    if (!shipper) return

    if (!confirm(`Are you sure you want to deactivate ${shipper.companyName}? This will hide them from active lists but preserve their data.`)) {
      return
    }

    setDeletingId(shipperId)
    try {
      const response = await fetch(`/api/shippers/${shipperId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete shipper')
      }

      showToast.success('Shipper deactivated successfully')
      await fetchShippers() // Refresh the list
    } catch (error) {
      console.error('Error deleting shipper:', error)
      showApiError(error, 'Failed to delete shipper')
    } finally {
      setDeletingId(null)
      setShowDeleteConfirm(null)
    }
  }

  const handleDNU = async (shipperId: string) => {
    const shipper = shippers.find(s => s.id === shipperId)
    if (!shipper) return

    const reason = prompt(`Mark ${shipper.companyName} as DNU (Do Not Use)?\n\nThis will:\n- Deactivate the account\n- Block the email from future signups\n\nAdmins can restore this account later if needed.\n\nEnter reason (optional):`)
    
    if (reason === null) return // User cancelled

    const password = prompt(`Enter your admin password to confirm:`)
    if (!password) return

    setDeletingId(shipperId)
    try {
      // Get admin user info
      const adminData = localStorage.getItem('admin') || localStorage.getItem('user')
      if (!adminData) {
        throw new Error('Admin authentication required')
      }
      const admin = JSON.parse(adminData)

      const response = await fetch(`/api/shippers/${shipperId}/dnu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason || `DNU: ${shipper.companyName}`,
          blockEmail: true,
          password: password,
          adminId: admin.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to mark shipper as DNU')
      }

      showToast.success('Shipper marked as DNU. Email has been blocked. You can restore this account later if needed.')
      await fetchShippers() // Refresh the list
    } catch (error) {
      console.error('Error marking shipper as DNU:', error)
      showApiError(error, 'Failed to mark shipper as DNU')
    } finally {
      setDeletingId(null)
      setShowDeleteConfirm(null)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading shippers...</p>
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
            Shippers
          </h1>
          <p className="text-slate-400">Manage client companies and facilities</p>
        </div>
        <Link
          href="/admin/shippers/brokerage"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Brokerage Shippers
        </Link>
      </div>

      {/* Shippers Table */}
      <div className="glass-primary rounded-xl overflow-hidden border border-slate-700/50 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Facilities
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Loads
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {shippers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <EmptyState
                      portal="admin"
                      title="No Shippers Yet"
                      description="Shippers will be created when load requests are submitted."
                      icon={
                        <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      }
                    />
                  </td>
                </tr>
              ) : (
                shippers.map((shipper) => (
                  <tr key={shipper.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{shipper.companyName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-300">
                        {shipper.clientType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {shipper.contactName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {shipper.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {shipper.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {shipper._count?.facilities ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {shipper._count?.loadRequests ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDateTime(shipper.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(shipper.id)}
                          disabled={deletingId === shipper.id}
                          className="p-2 text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Deactivate shipper (soft delete)"
                        >
                          {deletingId === shipper.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDNU(shipper.id)}
                          disabled={deletingId === shipper.id}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Mark as DNU (permanently delete and block email)"
                        >
                          {deletingId === shipper.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
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
