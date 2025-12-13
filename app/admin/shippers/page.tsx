'use client'

import { useState, useEffect } from 'react'
import { formatDateTime } from '@/lib/utils'
import { showToast, showApiError } from '@/lib/toast'

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

    const reason = prompt(`Mark ${shipper.companyName} as DNU (Do Not Use)?\n\nThis will:\n- Permanently delete the account\n- Block the email from future signups\n\nEnter reason (optional):`)
    
    if (reason === null) return // User cancelled

    if (!confirm(`⚠️ WARNING: This will PERMANENTLY DELETE ${shipper.companyName} and BLOCK ${shipper.email} from signing up again.\n\nThis action cannot be undone. Continue?`)) {
      return
    }

    setDeletingId(shipperId)
    try {
      const response = await fetch(`/api/shippers/${shipperId}/dnu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason || `DNU: ${shipper.companyName}`,
          blockEmail: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to mark shipper as DNU')
      }

      showToast.success('Shipper marked as DNU and deleted. Email has been blocked.')
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
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading shippers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Shippers</h1>
        <p className="text-gray-600">Manage client companies and facilities</p>
      </div>

      {/* Shippers Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Facilities
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Loads
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shippers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-lg font-medium">No shippers yet</p>
                      <p className="text-sm">Shippers will be created when load requests are submitted</p>
                    </div>
                  </td>
                </tr>
              ) : (
                shippers.map((shipper) => (
                  <tr key={shipper.id} className="hover:bg-white/40 transition-base">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">{shipper.companyName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {shipper.clientType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {shipper.contactName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {shipper.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {shipper.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-800">
                        {shipper._count.facilities}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent-100 text-accent-800">
                        {shipper._count.loadRequests}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(shipper.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(shipper.id)}
                          disabled={deletingId === shipper.id}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
