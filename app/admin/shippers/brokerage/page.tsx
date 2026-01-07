'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAdminFromStorage } from '@/lib/auth-admin'
import { showToast, showApiError } from '@/lib/toast'
import { formatDateTime } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'

interface BrokerageShipper {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string
  subscriptionTier: string
  dedicatedDispatcherId: string | null
  createdAt: string
  loadCount: number
  facilityCount: number
  dispatcher: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

interface Dispatcher {
  id: string
  name: string
  email: string
  role: string
}

export default function BrokerageShippersPage() {
  const router = useRouter()
  const [shippers, setShippers] = useState<BrokerageShipper[]>([])
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [admin, setAdmin] = useState<any>(null)
  const [assigningShipperId, setAssigningShipperId] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedShipper, setSelectedShipper] = useState<BrokerageShipper | null>(null)
  const [selectedDispatcherId, setSelectedDispatcherId] = useState<string>('')

  useEffect(() => {
    const adminData = getAdminFromStorage()
    if (!adminData) {
      router.push('/admin/login')
      return
    }
    setAdmin(adminData)
    fetchBrokerageShippers(adminData)
  }, [router])

  const fetchBrokerageShippers = async (adminData: any) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/shippers/brokerage', {
        headers: {
          'x-admin-id': adminData.id,
          'x-admin-role': adminData.role,
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to fetch brokerage shippers')
      }

      const data = await response.json()
      setShippers(data.shippers || [])
      setDispatchers(data.dispatchers || [])
    } catch (err) {
      console.error('Error fetching brokerage shippers:', err)
      setError(err instanceof Error ? err.message : 'Failed to load brokerage shippers')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignDispatcher = (shipper: BrokerageShipper) => {
    setSelectedShipper(shipper)
    setSelectedDispatcherId(shipper.dedicatedDispatcherId || '')
    setShowAssignModal(true)
  }

  const handleSaveAssignment = async () => {
    if (!selectedShipper || !admin) return

    setAssigningShipperId(selectedShipper.id)
    try {
      const response = await fetch(`/api/admin/shippers/${selectedShipper.id}/dispatcher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': admin.id,
          'x-admin-role': admin.role,
        },
        body: JSON.stringify({
          dispatcherId: selectedDispatcherId || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign dispatcher')
      }

      showToast.success(
        selectedDispatcherId 
          ? 'Dispatcher assigned successfully' 
          : 'Dispatcher unassigned successfully'
      )
      setShowAssignModal(false)
      setSelectedShipper(null)
      setSelectedDispatcherId('')
      await fetchBrokerageShippers(admin)
    } catch (err) {
      console.error('Error assigning dispatcher:', err)
      showApiError(err, 'Failed to assign dispatcher')
    } finally {
      setAssigningShipperId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="px-6 md:px-8 pb-6 md:pb-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading brokerage shippers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-0 z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/admin/shippers"
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tight">
              Brokerage Shippers
            </h1>
          </div>
          <p className="text-slate-400 ml-8">Manage dispatcher assignments for Premium tier clients</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-cyan-400 font-data">{shippers.length}</div>
          <div className="text-sm text-slate-400">Premium Clients</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border-2 border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {shippers.length === 0 ? (
        <div className="glass-primary rounded-xl border border-slate-700/50 shadow-lg">
          <EmptyState
            portal="admin"
            title="No Brokerage Shippers"
            description="No shippers have signed up for the Premium Brokerage Package yet."
            icon={
              <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
        </div>
      ) : (
        <div className="glass-primary rounded-xl overflow-hidden border border-slate-700/50 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Assigned Dispatcher
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {shippers.map((shipper) => (
                  <tr key={shipper.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-white">{shipper.companyName}</div>
                      <div className="text-sm text-slate-400">{shipper.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{shipper.contactName}</div>
                      <div className="text-xs text-slate-400">{shipper.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-sm text-slate-300">
                            <span className="font-bold text-white font-data">{shipper.loadCount}</span> loads
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-300">
                            <span className="font-bold text-white font-data">{shipper.facilityCount}</span> facilities
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {shipper.dispatcher ? (
                        <div>
                          <div className="text-sm font-medium text-white">{shipper.dispatcher.name}</div>
                          <div className="text-xs text-slate-400">{shipper.dispatcher.email}</div>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                            shipper.dispatcher.role === 'ADMIN'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          }`}>
                            {shipper.dispatcher.role}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDateTime(shipper.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleAssignDispatcher(shipper)}
                        disabled={assigningShipperId === shipper.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {assigningShipperId === shipper.id ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Assigning...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {shipper.dispatcher ? 'Reassign' : 'Assign'}
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Dispatcher Modal - Dark Theme */}
      {showAssignModal && selectedShipper && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => {
          setShowAssignModal(false)
          setSelectedShipper(null)
          setSelectedDispatcherId('')
        }}>
          <div className="glass-primary p-8 rounded-2xl max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">Assign Dispatcher</h2>
            <p className="text-slate-300 mb-6">
              Assign a dedicated dispatcher to <strong className="text-white">{selectedShipper.companyName}</strong>
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Select Dispatcher
              </label>
              <select
                value={selectedDispatcherId}
                onChange={(e) => setSelectedDispatcherId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
              >
                <option value="">Unassign (No dispatcher)</option>
                {dispatchers.map((dispatcher) => (
                  <option key={dispatcher.id} value={dispatcher.id}>
                    {dispatcher.name} ({dispatcher.email}) - {dispatcher.role}
                  </option>
                ))}
              </select>
              {dispatchers.length === 0 && (
                <p className="text-sm text-slate-400 mt-2">
                  No dispatchers available. Create admin/dispatcher users first.
                </p>
              )}
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedShipper(null)
                  setSelectedDispatcherId('')
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 border border-slate-600/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignment}
                disabled={assigningShipperId === selectedShipper.id}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningShipperId === selectedShipper.id ? 'Saving...' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
