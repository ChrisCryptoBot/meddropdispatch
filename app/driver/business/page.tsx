'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { showToast, showApiError } from '@/lib/toast'
import { EmptyState } from '@/components/ui/EmptyState'

interface EarningsData {
  weekly: {
    total: number
    loads: number
    average: number
  }
  monthly: {
    total: number
    loads: number
    average: number
  }
  pending: number
  paid: number
}

interface DriverClient {
  id: string
  companyName: string
  contactName: string
  email: string | null
  phone: string
  addressLine1: string | null
  createdAt: string
}

interface LoadSummary {
  id: string
  publicTrackingCode: string
  status: string
  quoteAmount: number | null
  driverQuoteAmount: number | null
  shipperPaymentStatus: string | null
  shipperPaidAt: string | null
  actualDeliveryTime: string | null
  shipper: {
    companyName: string
  }
}

export default function DriverBusinessPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'earnings' | 'invoices' | 'clients' | 'payments'>('overview')
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [clients, setClients] = useState<DriverClient[]>([])
  const [loads, setLoads] = useState<LoadSummary[]>([])
  const [showClientModal, setShowClientModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedLoads, setSelectedLoads] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authResponse = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!authResponse.ok) {
          router.push('/driver/login')
          return
        }

        const authData = await authResponse.json()
        if (!authData.authenticated || authData.user?.userType !== 'driver' || !authData.user?.isAdmin) {
          router.push('/driver/dashboard')
          return
        }

        setDriver(authData.user)
        await Promise.all([
          fetchEarnings(authData.user.id),
          fetchClients(authData.user.id),
          fetchLoads(authData.user.id)
        ])
      } catch (error) {
        console.error('Error fetching data:', error)
        showApiError(error, 'Failed to load business data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [router])

  const fetchEarnings = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/earnings`)
      if (response.ok) {
        const data = await response.json()
        setEarnings(data)
      }
    } catch (error) {
      console.error('Error fetching earnings:', error)
    }
  }

  const fetchClients = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/clients`)
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchLoads = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/my-loads?status=DELIVERED,COMPLETED`)
      if (response.ok) {
        const data = await response.json()
        setLoads(data.loads || [])
      }
    } catch (error) {
      console.error('Error fetching loads:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading business dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!driver?.isAdmin) {
    return (
      <div className="p-6 md:p-8">
        <div className="glass-primary rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Business Tools Unavailable</h2>
          <p className="text-slate-400 mb-6">Business tools are only available for owner-operators.</p>
          <Link
            href="/driver/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Business Command Center
        </h1>
        <p className="text-slate-400">Manage your business operations, finances, and clients</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-700/50">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'earnings', label: 'Earnings' },
          { id: 'invoices', label: 'Invoices' },
          { id: 'clients', label: 'Clients' },
          { id: 'payments', label: 'Payments' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Earnings Summary Cards */}
          {earnings && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-primary rounded-xl p-6 border border-slate-700/50">
                <p className="text-slate-400 text-sm mb-1">Weekly Earnings</p>
                <p className="text-2xl font-bold text-white">${earnings.weekly.total.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">{earnings.weekly.loads} loads</p>
              </div>
              <div className="glass-primary rounded-xl p-6 border border-slate-700/50">
                <p className="text-slate-400 text-sm mb-1">Monthly Earnings</p>
                <p className="text-2xl font-bold text-white">${earnings.monthly.total.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-1">{earnings.monthly.loads} loads</p>
              </div>
              <div className="glass-primary rounded-xl p-6 border border-slate-700/50">
                <p className="text-slate-400 text-sm mb-1">Pending Payment</p>
                <p className="text-2xl font-bold text-yellow-400">${earnings.pending.toFixed(2)}</p>
              </div>
              <div className="glass-primary rounded-xl p-6 border border-slate-700/50">
                <p className="text-slate-400 text-sm mb-1">Paid This Month</p>
                <p className="text-2xl font-bold text-green-400">${earnings.paid.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('invoices')}
                className="p-4 bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-lg text-white font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="font-bold">Create Invoice</p>
                    <p className="text-sm text-cyan-100">Generate invoice for completed loads</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setShowClientModal(true)}
                className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg text-white font-semibold hover:shadow-xl hover:shadow-blue-500/50 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <div>
                    <p className="font-bold">Add Client</p>
                    <p className="text-sm text-blue-100">Add a new private client</p>
                  </div>
                </div>
              </button>
              <Link
                href="/driver/manual-load"
                className="p-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg text-white font-semibold hover:shadow-xl hover:shadow-purple-500/50 transition-all text-left block"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <div>
                    <p className="font-bold">Create Load</p>
                    <p className="text-sm text-purple-100">Self-dispatch a new load</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold text-white mb-4">Recent Completed Loads</h2>
            {loads.length === 0 ? (
              <EmptyState
                portal="driver"
                title="No completed loads yet"
                description="Completed loads will appear here for invoicing"
              />
            ) : (
              <div className="space-y-2">
                {loads.slice(0, 5).map((load) => (
                  <div key={load.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="font-semibold text-white">{load.publicTrackingCode}</p>
                      <p className="text-sm text-slate-400">{load.shipper.companyName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        ${(load.driverQuoteAmount || load.quoteAmount || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {load.shipperPaymentStatus || 'PENDING'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'earnings' && (
        <div className="glass-primary rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-xl font-bold text-white mb-4">Earnings Breakdown</h2>
          {earnings ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">This Week</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-sm">Total</p>
                    <p className="text-2xl font-bold text-white">${earnings.weekly.total.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-sm">Loads</p>
                    <p className="text-2xl font-bold text-white">{earnings.weekly.loads}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-sm">Average</p>
                    <p className="text-2xl font-bold text-white">${earnings.weekly.average.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">This Month</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-sm">Total</p>
                    <p className="text-2xl font-bold text-white">${earnings.monthly.total.toFixed(2)}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-sm">Loads</p>
                    <p className="text-2xl font-bold text-white">{earnings.monthly.loads}</p>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-slate-400 text-sm">Average</p>
                    <p className="text-2xl font-bold text-white">${earnings.monthly.average.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400">Loading earnings data...</p>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Invoices</h2>
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all"
            >
              Create Invoice
            </button>
          </div>
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50">
            <EmptyState
              portal="driver"
              title="No invoices yet"
              description="Create your first invoice from completed loads"
            />
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Private Clients</h2>
            <button
              onClick={() => setShowClientModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-blue-500/50 transition-all"
            >
              Add Client
            </button>
          </div>
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50">
            {clients.length === 0 ? (
              <EmptyState
                portal="driver"
                title="No clients yet"
                description="Add your first private client to get started"
              />
            ) : (
              <div className="space-y-2">
                {clients.map((client) => (
                  <div key={client.id} className="p-4 bg-slate-800/50 rounded-lg">
                    <p className="font-semibold text-white">{client.companyName}</p>
                    <p className="text-sm text-slate-400">{client.contactName} • {client.phone}</p>
                    {client.email && <p className="text-sm text-slate-500">{client.email}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="glass-primary rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-xl font-bold text-white mb-4">Payment Tracking</h2>
          <EmptyState
            portal="driver"
            title="Payment tracking coming soon"
            description="Track payments from shippers and platform payments"
          />
        </div>
      )}
    </div>
  )
}

