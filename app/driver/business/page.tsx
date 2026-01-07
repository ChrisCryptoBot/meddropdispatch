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
  const [activeTab, setActiveTab] = useState<'overview' | 'earnings' | 'invoices' | 'clients' | 'payments' | 'team'>('overview')
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [clients, setClients] = useState<DriverClient[]>([])
  const [loads, setLoads] = useState<LoadSummary[]>([])
  const [showClientModal, setShowClientModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedLoads, setSelectedLoads] = useState<Set<string>>(new Set())
  // Fleet/Team Management
  const [fleet, setFleet] = useState<any>(null)
  const [fleetDrivers, setFleetDrivers] = useState<any[]>([])
  const [fleetInvites, setFleetInvites] = useState<any[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [newInvite, setNewInvite] = useState({ role: 'DRIVER', expiresInDays: 7, maxUses: 1 })

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
        // Allow access if driver has isAdmin flag OR is part of a fleet (OWNER/ADMIN/DRIVER)
        const hasBusinessAccess = authData.user?.isAdmin || 
          (authData.user?.fleetRole && authData.user.fleetRole !== 'INDEPENDENT')
        
        if (!authData.authenticated || authData.user?.userType !== 'driver' || !hasBusinessAccess) {
          router.push('/driver/dashboard')
          return
        }

        setDriver(authData.user)
        await Promise.all([
          fetchEarnings(authData.user.id),
          fetchClients(authData.user.id),
          fetchLoads(authData.user.id),
          fetchFleetData(authData.user.id)
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

  const fetchFleetData = async (driverId: string) => {
    try {
      const response = await fetch('/api/fleets', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.fleet) {
          setFleet(data.fleet)
          
          // Fetch fleet drivers if OWNER or ADMIN
          if (data.role === 'OWNER' || data.role === 'ADMIN') {
            const driversResponse = await fetch(`/api/fleets/${data.fleet.id}/drivers`, {
              credentials: 'include',
            })
            if (driversResponse.ok) {
              const driversData = await driversResponse.json()
              setFleetDrivers(driversData.drivers || [])
            }

            // Fetch invites if OWNER or ADMIN
            const invitesResponse = await fetch('/api/fleets/invites', {
              credentials: 'include',
            })
            if (invitesResponse.ok) {
              const invitesData = await invitesResponse.json()
              setFleetInvites(invitesData.invites || [])
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching fleet data:', error)
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

  // Allow access if driver has isAdmin flag OR is part of a fleet
  const hasBusinessAccess = driver?.isAdmin || 
    (driver?.fleetRole && driver.fleetRole !== 'INDEPENDENT')
  
  if (!hasBusinessAccess) {
    return (
      <div className="p-6 md:p-8">
        <div className="glass-primary rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Business Tools Unavailable</h2>
          <p className="text-slate-400 mb-6">Business tools are only available for owner-operators and fleet members.</p>
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
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Business Command Center
        </h1>
        <p className="text-slate-400">Manage your business operations, finances, and clients</p>
      </div>

      {/* Upgrade to Fleet Banner (for Independent drivers) */}
      {driver?.fleetRole === 'INDEPENDENT' && (
        <div className="mb-6 glass-primary rounded-xl p-6 border border-cyan-500/30 bg-cyan-500/10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Ready to grow your team?</h3>
              <p className="text-slate-300">Upgrade to a Fleet account to manage multiple drivers and streamline operations.</p>
            </div>
            <button
              onClick={async () => {
                const fleetName = prompt('Enter your fleet name (DBA):')
                if (!fleetName || !fleetName.trim()) return

                const taxId = prompt('Enter your Tax ID (EIN) - Optional. Press Cancel to skip:')
                
                try {
                  const response = await fetch('/api/fleets', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      name: fleetName.trim(),
                      taxId: taxId?.trim() || undefined,
                    }),
                  })

                  if (response.ok) {
                    showToast.success('Fleet created successfully! You can now invite drivers.')
                    // Refresh page to show team tab
                    window.location.reload()
                  } else {
                    const data = await response.json()
                    throw new Error(data.error || 'Failed to create fleet')
                  }
                } catch (error) {
                  showApiError(error, 'Failed to create fleet')
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 whitespace-nowrap"
            >
              Create Fleet
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-700/50">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'earnings', label: 'Earnings' },
          { id: 'invoices', label: 'Invoices' },
          { id: 'clients', label: 'Clients' },
          { id: 'payments', label: 'Payments' },
          ...(fleet && (driver?.fleetRole === 'OWNER' || driver?.fleetRole === 'ADMIN') 
            ? [{ id: 'team', label: 'My Team' }] 
            : []),
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

      {activeTab === 'team' && fleet && (driver?.fleetRole === 'OWNER' || driver?.fleetRole === 'ADMIN') && (
        <div className="space-y-6">
          {/* Fleet Info */}
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{fleet.name}</h2>
                {fleet.taxId && (
                  <p className="text-sm text-slate-400 mt-1">Tax ID: {fleet.taxId}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-cyan-400">{fleetDrivers.length}</p>
                <p className="text-sm text-slate-400">Team Members</p>
              </div>
            </div>
          </div>

          {/* Team Roster */}
          <div className="glass-primary rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Team Roster</h2>
              {driver?.fleetRole === 'OWNER' && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Invite Driver
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              {fleetDrivers.length === 0 ? (
                <div className="p-12">
                  <EmptyState
                    portal="driver"
                    title="No team members yet"
                    description="Invite drivers to join your fleet"
                  />
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Loads</th>
                      {driver?.fleetRole === 'OWNER' && (
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {fleetDrivers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-white">{member.firstName} {member.lastName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{member.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            member.fleetRole === 'OWNER'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : member.fleetRole === 'ADMIN'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}>
                            {member.fleetRole}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            member.status === 'AVAILABLE'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : member.status === 'ON_ROUTE'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          }`}>
                            {member.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {member._count?.loadRequests || 0}
                        </td>
                        {driver?.fleetRole === 'OWNER' && member.fleetRole !== 'OWNER' && (
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              {member.fleetRole === 'DRIVER' && (
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Promote ${member.firstName} ${member.lastName} to ADMIN?`)) return
                                    try {
                                      const response = await fetch(`/api/fleets/${fleet.id}/drivers/${member.id}`, {
                                        method: 'PATCH',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        credentials: 'include',
                                        body: JSON.stringify({ fleetRole: 'ADMIN' }),
                                      })
                                      if (response.ok) {
                                        showToast.success('Driver promoted to ADMIN')
                                        await fetchFleetData(driver.id)
                                      } else {
                                        throw new Error('Failed to promote driver')
                                      }
                                    } catch (error) {
                                      showApiError(error, 'Failed to promote driver')
                                    }
                                  }}
                                  className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                                  title="Promote to Admin"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                  </svg>
                                </button>
                              )}
                              {member.fleetRole === 'ADMIN' && (
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Demote ${member.firstName} ${member.lastName} to DRIVER?`)) return
                                    try {
                                      const response = await fetch(`/api/fleets/${fleet.id}/drivers/${member.id}`, {
                                        method: 'PATCH',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        credentials: 'include',
                                        body: JSON.stringify({ fleetRole: 'DRIVER' }),
                                      })
                                      if (response.ok) {
                                        showToast.success('Admin demoted to DRIVER')
                                        await fetchFleetData(driver.id)
                                      } else {
                                        throw new Error('Failed to demote admin')
                                      }
                                    } catch (error) {
                                      showApiError(error, 'Failed to demote admin')
                                    }
                                  }}
                                  className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                  title="Demote to Driver"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (!confirm(`Remove ${member.firstName} ${member.lastName} from the fleet?`)) return
                                  try {
                                    const response = await fetch(`/api/fleets/${fleet.id}/drivers/${member.id}`, {
                                      method: 'DELETE',
                                      credentials: 'include',
                                    })
                                    if (response.ok) {
                                      showToast.success('Driver removed from fleet')
                                      await fetchFleetData(driver.id)
                                    } else {
                                      throw new Error('Failed to remove driver')
                                    }
                                  } catch (error) {
                                    showApiError(error, 'Failed to remove driver')
                                  }
                                }}
                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remove from Fleet"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Active Invites */}
          {driver?.fleetRole === 'OWNER' && (
            <div className="glass-primary rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-white">Active Invites</h2>
              </div>
              <div className="p-6">
                {fleetInvites.length === 0 ? (
                  <EmptyState
                    portal="driver"
                    title="No active invites"
                    description="Create an invite code to add drivers to your fleet"
                  />
                ) : (
                  <div className="space-y-4">
                    {fleetInvites.map((invite) => (
                      <div key={invite.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-mono font-bold text-cyan-400 text-lg">{invite.code}</p>
                            <p className="text-sm text-slate-400 mt-1">
                              Role: <span className="text-slate-300">{invite.role}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-400">
                              {invite.maxUses ? `${invite.usedCount}/${invite.maxUses} uses` : `${invite.usedCount} uses`}
                            </p>
                            {invite.expiresAt && (
                              <p className="text-xs text-slate-500 mt-1">
                                Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/driver/signup?invite=${invite.code}`}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-600/50 bg-slate-900/50 text-slate-300 text-sm"
                          />
                          <button
                            onClick={() => {
                              const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/driver/signup?invite=${invite.code}`
                              navigator.clipboard.writeText(url)
                              showToast.success('Invite link copied!')
                            }}
                            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            Copy Link
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowInviteModal(false)}>
          <div className="glass-primary p-8 rounded-2xl max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">Create Invite</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Role</label>
                <select
                  value={newInvite.role}
                  onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                >
                  <option value="DRIVER">Driver</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Expires In (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={newInvite.expiresInDays}
                  onChange={(e) => setNewInvite({ ...newInvite, expiresInDays: parseInt(e.target.value) || 7 })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Max Uses</label>
                <input
                  type="number"
                  min="1"
                  value={newInvite.maxUses}
                  onChange={(e) => setNewInvite({ ...newInvite, maxUses: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-white"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setNewInvite({ role: 'DRIVER', expiresInDays: 7, maxUses: 1 })
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 border border-slate-600/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/fleets/invites', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                      body: JSON.stringify(newInvite),
                    })
                    if (response.ok) {
                      showToast.success('Invite created successfully!')
                      setShowInviteModal(false)
                      setNewInvite({ role: 'DRIVER', expiresInDays: 7, maxUses: 1 })
                      await fetchFleetData(driver.id)
                    } else {
                      const data = await response.json()
                      throw new Error(data.error || 'Failed to create invite')
                    }
                  } catch (error) {
                    showApiError(error, 'Failed to create invite')
                  }
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
              >
                Create Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

