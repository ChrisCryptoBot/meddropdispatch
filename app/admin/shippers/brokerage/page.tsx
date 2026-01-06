'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAdminFromStorage } from '@/lib/auth-admin'
import { showToast, showApiError } from '@/lib/toast'

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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading brokerage shippers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      {/* Title Container */}
      <div className="sticky top-0 z-30 bg-gradient-medical-bg backdrop-blur-sm pt-[73px] pb-4 mb-8 print:mb-4 print:static print:pt-8 print:top-0 border-b border-blue-200/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link
              href="/admin/shippers"
              className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to All Shippers
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">Brokerage Package Shippers</h1>
            <p className="text-gray-600 print:text-sm">Manage dispatcher assignments for Premium tier clients</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-teal-600">{shippers.length}</div>
            <div className="text-sm text-gray-600">Premium Clients</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-urgent-50 border-2 border-urgent-200 rounded-xl">
          <p className="text-urgent-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {shippers.length === 0 ? (
        <div className="glass-primary rounded-2xl p-12 text-center border-2 border-blue-200/30 shadow-glass">
          <div className="w-16 h-16 bg-gradient-accent rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Brokerage Shippers</h3>
          <p className="text-gray-600">No shippers have signed up for the Premium Brokerage Package yet.</p>
        </div>
      ) : (
        <div className="glass-primary rounded-2xl border-2 border-blue-200/30 shadow-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50/60 border-b border-blue-200/30">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Stats</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assigned Dispatcher</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200/30">
                {shippers.map((shipper) => (
                  <tr key={shipper.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{shipper.companyName}</div>
                      <div className="text-sm text-gray-500">{shipper.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{shipper.contactName}</div>
                      <div className="text-xs text-gray-500">{shipper.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">{shipper.loadCount}</span> loads
                      </div>
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">{shipper.facilityCount}</span> facilities
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {shipper.dispatcher ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{shipper.dispatcher.name}</div>
                          <div className="text-xs text-gray-500">{shipper.dispatcher.email}</div>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                            shipper.dispatcher.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-teal-100 text-teal-700 border border-teal-200'
                          }`}>
                            {shipper.dispatcher.role}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(shipper.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleAssignDispatcher(shipper)}
                        disabled={assigningShipperId === shipper.id}
                        className="inline-flex items-center px-4 py-2 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {assigningShipperId === shipper.id ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Assigning...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Assign Dispatcher Modal */}
      {showAssignModal && selectedShipper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-primary p-8 rounded-3xl max-w-md w-full border-2 border-blue-200/30 shadow-glass">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Assign Dispatcher</h2>
            <p className="text-gray-600 mb-6">
              Assign a dedicated dispatcher to <strong>{selectedShipper.companyName}</strong>
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Dispatcher
              </label>
              <select
                value={selectedDispatcherId}
                onChange={(e) => setSelectedDispatcherId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white/80"
              >
                <option value="">Unassign (No dispatcher)</option>
                {dispatchers.map((dispatcher) => (
                  <option key={dispatcher.id} value={dispatcher.id}>
                    {dispatcher.name} ({dispatcher.email}) - {dispatcher.role}
                  </option>
                ))}
              </select>
              {dispatchers.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
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
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignment}
                disabled={assigningShipperId === selectedShipper.id}
                className="flex-1 px-4 py-2 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
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










