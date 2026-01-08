'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { showToast, showApiError } from '@/lib/toast'
import { LOAD_STATUS_LABELS, LOAD_STATUS_COLORS } from '@/lib/constants'

interface Shipper {
  id: string
  companyName: string
  shipperCode: string | null
  clientType: string
  contactName: string
  phone: string
  email: string
  isActive: boolean
  paymentTerms: string
  preferredPaymentMethod: string
  subscriptionTier: string
  billingContactName: string | null
  billingContactEmail: string | null
  billingAddressLine1: string | null
  billingAddressLine2: string | null
  billingCity: string | null
  billingState: string | null
  billingPostalCode: string | null
  dispatcher: {
    id: string
    name: string
    email: string
    role: string
  } | null
  facilities: Array<{
    id: string
    name: string
    facilityType: string
    city: string
    state: string
    contactName: string
    contactPhone: string
  }>
  _count: {
    loadRequests: number
    facilities: number
  }
}

interface Load {
  id: string
  publicTrackingCode: string
  status: string
  quoteAmount: number | null
  createdAt: string
  readyTime: string | null
  deliveryDeadline: string | null
  pickupFacility: {
    name: string
    city: string
    state: string
  }
  dropoffFacility: {
    name: string
    city: string
    state: string
  }
  driver: {
    firstName: string
    lastName: string
  } | null
}

interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  total: number
  status: string
  paidAt: string | null
}

export default function ShipperDetailPage() {
  const router = useRouter()
  const params = useParams()
  const shipperId = params.id as string

  const [shipper, setShipper] = useState<Shipper | null>(null)
  const [loads, setLoads] = useState<Load[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'loads' | 'invoices' | 'facilities'>('overview')
  const [loadFilter, setLoadFilter] = useState<string>('all')
  const [loadSort, setLoadSort] = useState<'newest' | 'oldest' | 'amount' | 'status'>('newest')

  useEffect(() => {
    fetchShipperData()
  }, [shipperId])

  useEffect(() => {
    if (shipperId && activeTab === 'loads') {
      fetchLoads()
    } else if (shipperId && activeTab === 'invoices') {
      fetchInvoices()
    }
  }, [shipperId, activeTab])

  const fetchShipperData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/shippers/${shipperId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Shipper not found')
        }
        throw new Error('Failed to fetch shipper')
      }

      const data = await response.json()
      setShipper(data.shipper)
    } catch (err) {
      console.error('Error fetching shipper:', err)
      setError(err instanceof Error ? err.message : 'Failed to load shipper')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLoads = async () => {
    try {
      const response = await fetch(`/api/shippers/${shipperId}/loads?limit=100`)
      if (response.ok) {
        const data = await response.json()
        setLoads(data.loads || [])
      }
    } catch (err) {
      console.error('Error fetching loads:', err)
    }
  }

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`/api/invoices?shipperId=${shipperId}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      }
    } catch (err) {
      console.error('Error fetching invoices:', err)
    }
  }

  const filteredLoads = loads.filter(load => {
    if (loadFilter === 'all') return true
    if (loadFilter === 'active') return ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(load.status)
    if (loadFilter === 'delivered') return load.status === 'DELIVERED'
    if (loadFilter === 'cancelled') return ['CANCELLED', 'DENIED'].includes(load.status)
    return load.status === loadFilter
  }).sort((a, b) => {
    switch (loadSort) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'amount':
        return (b.quoteAmount || 0) - (a.quoteAmount || 0)
      case 'status':
        return a.status.localeCompare(b.status)
      default:
        return 0
    }
  })

  const stats = {
    totalLoads: loads.length,
    activeLoads: loads.filter(l => ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'].includes(l.status)).length,
    deliveredLoads: loads.filter(l => l.status === 'DELIVERED').length,
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter(i => i.status === 'PAID').length,
    outstandingInvoices: invoices.filter(i => ['SENT', 'OVERDUE'].includes(i.status)).length,
    totalPaid: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0),
    totalOutstanding: invoices.filter(i => ['SENT', 'OVERDUE'].includes(i.status)).reduce((sum, i) => sum + i.total, 0),
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading shipper details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !shipper) {
    return (
      <div className="p-8">
        <div className="glass-primary rounded-xl p-8 border border-slate-700/50 shadow-lg text-center">
          <p className="text-red-400 mb-4">{error || 'Shipper not found'}</p>
          <Link
            href="/admin/shippers"
            className="inline-block px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all"
          >
            Back to Shippers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link
              href="/admin/shippers"
              className="text-cyan-400 hover:text-cyan-300 mb-2 inline-flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Shippers
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
              {shipper.companyName}
            </h1>
            <p className="text-slate-400">Shipper details and activity overview</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              shipper.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
            }`}>
              {shipper.isActive ? 'Active' : 'Inactive'}
            </span>
            {shipper.subscriptionTier === 'BROKERAGE' && (
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-cyan-600 to-cyan-700 text-white border border-cyan-500/30">
                Premium Tier
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{stats.totalLoads}</p>
            <p className="text-sm text-slate-400 font-medium">Total Loads</p>
          </div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{stats.activeLoads}</p>
            <p className="text-sm text-slate-400 font-medium">Active Loads</p>
          </div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{formatCurrency(stats.totalOutstanding)}</p>
            <p className="text-sm text-slate-400 font-medium">Outstanding</p>
          </div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{stats.outstandingInvoices}</p>
            <p className="text-sm text-slate-400 font-medium">Pending Invoices</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700/50 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-cyan-500 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-cyan-400'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('loads')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'loads'
              ? 'border-cyan-500 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-cyan-400'
          }`}
        >
          Loads ({stats.totalLoads})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-cyan-500 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-cyan-400'
          }`}
        >
          Invoices ({stats.totalInvoices})
        </button>
        <button
          onClick={() => setActiveTab('facilities')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'facilities'
              ? 'border-cyan-500 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-cyan-400'
          }`}
        >
          Facilities ({shipper.facilities.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Company Information */}
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">Company Information</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Company Name</p>
                <p className="font-semibold text-white">{shipper.companyName}</p>
              </div>
              {shipper.shipperCode && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Shipper Code</p>
                  <p className="font-mono font-bold text-cyan-400 font-data">{shipper.shipperCode}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-400 mb-1">Client Type</p>
                <p className="text-white">{shipper.clientType.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Subscription Tier</p>
                <p className="text-white">{shipper.subscriptionTier}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Primary Contact</p>
                <p className="font-semibold text-white">{shipper.contactName}</p>
                <p className="text-slate-300 text-sm">{shipper.email}</p>
                <p className="text-slate-300 text-sm">{shipper.phone}</p>
              </div>
              {shipper.dispatcher && (
                <div className="pt-4 border-t border-slate-700/50">
                  <p className="text-sm text-slate-400 mb-1">Dedicated Dispatcher</p>
                  <p className="font-semibold text-white">{shipper.dispatcher.name}</p>
                  <p className="text-slate-300 text-sm">{shipper.dispatcher.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Billing Information */}
          {(shipper.billingAddressLine1 || shipper.billingCity) && (
            <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-4">Billing Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Billing Address</p>
                  <p className="text-white">
                    {shipper.billingAddressLine1}
                    {shipper.billingAddressLine2 && <><br />{shipper.billingAddressLine2}</>}
                    <br />
                    {shipper.billingCity}, {shipper.billingState} {shipper.billingPostalCode}
                  </p>
                </div>
                {shipper.billingContactName && (
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Billing Contact</p>
                    <p className="text-white">{shipper.billingContactName}</p>
                    {shipper.billingContactEmail && (
                      <p className="text-slate-300 text-sm">{shipper.billingContactEmail}</p>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-400 mb-1">Payment Terms</p>
                  <p className="text-white">{shipper.paymentTerms.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Preferred Payment Method</p>
                  <p className="text-white">{shipper.preferredPaymentMethod.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">Financial Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Invoices</span>
                <span className="font-bold text-white font-data">{stats.totalInvoices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paid</span>
                <span className="font-bold text-green-400 font-data">{stats.paidInvoices}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Outstanding</span>
                <span className="font-bold text-yellow-400 font-data">{stats.outstandingInvoices}</span>
              </div>
              <div className="pt-3 border-t border-slate-700/50 flex justify-between">
                <span className="font-semibold text-white">Total Paid</span>
                <span className="font-bold text-green-400 font-data">{formatCurrency(stats.totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-white">Total Outstanding</span>
                <span className="font-bold text-yellow-400 font-data">{formatCurrency(stats.totalOutstanding)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'loads' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="glass-primary p-4 rounded-xl border border-slate-700/50 shadow-lg">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Status</label>
                <select
                  value={loadFilter}
                  onChange={(e) => setLoadFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
                <select
                  value={loadSort}
                  onChange={(e) => setLoadSort(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount">Amount (Highest)</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loads List */}
          {filteredLoads.length === 0 ? (
            <div className="glass-primary rounded-xl p-12 text-center border border-slate-700/50 shadow-lg">
              <p className="text-slate-400">No loads found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLoads.map((load) => (
                <Link
                  key={load.id}
                  href={`/admin/loads/${load.id}`}
                  className="block glass-primary rounded-xl p-5 border border-slate-700/50 hover:border-cyan-500/50 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-mono font-bold text-cyan-400 text-lg font-data">{load.publicTrackingCode}</p>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${LOAD_STATUS_COLORS[load.status as keyof typeof LOAD_STATUS_COLORS]}`}>
                          {LOAD_STATUS_LABELS[load.status as keyof typeof LOAD_STATUS_LABELS]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">
                        {load.pickupFacility.city}, {load.pickupFacility.state} → {load.dropoffFacility.city}, {load.dropoffFacility.state}
                      </p>
                      {load.driver && (
                        <p className="text-xs text-slate-400 mt-1">
                          Driver: {load.driver.firstName} {load.driver.lastName}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{formatDate(load.createdAt)}</p>
                    </div>
                    {load.quoteAmount && (
                      <div className="text-right">
                        <p className="font-bold text-white font-data">{formatCurrency(load.quoteAmount)}</p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="glass-primary rounded-xl p-12 text-center border border-slate-700/50 shadow-lg">
              <p className="text-slate-400">No invoices found</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/admin/invoices/${invoice.id}`}
                className="block glass-primary rounded-xl p-5 border border-slate-700/50 hover:border-cyan-500/50 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono font-bold text-cyan-400 text-lg font-data">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-slate-300">
                      Invoice Date: {formatDate(invoice.invoiceDate)} | Due: {formatDate(invoice.dueDate)}
                    </p>
                    {invoice.paidAt && (
                      <p className="text-xs text-green-400 mt-1">Paid: {formatDate(invoice.paidAt)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white font-data mb-1">{formatCurrency(invoice.total)}</p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      invoice.status === 'PAID' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      invoice.status === 'OVERDUE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      invoice.status === 'SENT' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-slate-700/50 text-slate-300 border border-slate-600/50'
                    }`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'facilities' && (
        <div className="space-y-4">
          {shipper.facilities.length === 0 ? (
            <div className="glass-primary rounded-xl p-12 text-center border border-slate-700/50 shadow-lg">
              <p className="text-slate-400">No facilities found</p>
            </div>
          ) : (
            shipper.facilities.map((facility) => (
              <div
                key={facility.id}
                className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg"
              >
                <h4 className="font-semibold text-white mb-2">{facility.name}</h4>
                <p className="text-sm text-slate-300">{facility.city}, {facility.state}</p>
                <p className="text-sm text-slate-400 mt-1">Type: {facility.facilityType.replace(/_/g, ' ')}</p>
                {facility.contactName && (
                  <p className="text-sm text-slate-400">Contact: {facility.contactName} - {facility.contactPhone}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

