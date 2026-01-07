'use client'

// Shipper Invoices Page
// View and manage invoices

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showToast, showApiError } from '@/lib/toast'
import { formatDate, formatCurrency } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyStates } from '@/components/ui/EmptyState'

interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  subtotal: number
  tax: number
  total: number
  status: string
  sentAt: string | null
  paidAt: string | null
  loadRequests: Array<{
    id: string
    publicTrackingCode: string
  }>
}

type SortField = 'newest' | 'oldest' | 'invoice_number' | 'due_date' | 'amount_high' | 'amount_low' | 'status'

export default function ShipperInvoicesPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortField>('newest')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Get shipper from API auth check (httpOnly cookie) - layout handles redirects
    const fetchShipperData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'shipper') {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        setShipper(data.user)
        fetchInvoices()
      } catch (error) {
        console.error('Error fetching shipper data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchShipperData()
  }, [filter]) // Keep filter dependency for invoice filtering

  const fetchInvoices = async () => {
    try {
      setIsLoading(true)
      const shipperData = localStorage.getItem('shipper')
      if (!shipperData) return

      const shipper = JSON.parse(shipperData)
      const statusParam = filter !== 'all' ? `&status=${filter}` : ''
      const response = await fetch(`/api/invoices?shipperId=${shipper.id}${statusParam}`)
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${invoiceNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
      showToast.error('Failed to download invoice')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-500/20 text-green-400 border border-green-500/30'
      case 'SENT':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
      case 'OVERDUE':
        return 'bg-red-500/20 text-red-400 border border-red-500/30'
      case 'DRAFT':
        return 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
      default:
        return 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
    }
  }

  // Filter and sort invoices (must be before early return)
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter((invoice) => invoice.status === filter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          invoice.loadRequests.some((l) => l.publicTrackingCode.toLowerCase().includes(query))
      )
    }

    // Sort invoices
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
        case 'oldest':
          return new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
        case 'invoice_number':
          return a.invoiceNumber.localeCompare(b.invoiceNumber)
        case 'due_date':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        case 'amount_high':
          return b.total - a.total
        case 'amount_low':
          return a.total - b.total
        case 'status':
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

    return sorted
  }, [invoices, filter, searchQuery, sortBy])

  const stats = useMemo(() => ({
    total: invoices.length,
    paid: invoices.filter((i) => i.status === 'PAID').length,
    pending: invoices.filter((i) => ['DRAFT', 'SENT'].includes(i.status)).length,
    overdue: invoices.filter((i) => i.status === 'OVERDUE').length,
    totalAmount: invoices.reduce((sum, i) => sum + i.total, 0),
    paidAmount: invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0),
  }), [invoices])

  if (isLoading) {
    return <LoadingSpinner portal="shipper" label="Loading invoices..." fullScreen />
  }

  return (
    <div className="p-8 print:p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 print:text-2xl">Invoices</h1>
            <p className="text-slate-400 text-sm md:text-base print:text-sm">View and download your invoices</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <div className="text-3xl font-bold text-white mb-1 font-data">{stats.total}</div>
          <div className="text-sm text-slate-400">Total Invoices</div>
        </div>
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <div className="text-3xl font-bold text-white mb-1 font-data">{stats.paid}</div>
          <div className="text-sm text-slate-400">Paid</div>
        </div>
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <div className="text-3xl font-bold text-white mb-1 font-data">{stats.pending}</div>
          <div className="text-sm text-slate-400">Pending</div>
        </div>
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <div className="text-3xl font-bold text-white mb-1 font-data">{stats.overdue}</div>
          <div className="text-sm text-slate-400">Overdue</div>
        </div>
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <div className="text-3xl font-bold text-white mb-1 font-data">
            ${stats.totalAmount.toFixed(2)}
          </div>
          <div className="text-sm text-slate-400">Total Amount</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass-primary p-4 rounded-xl mb-6 border border-slate-700/50 shadow-lg">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by invoice number, tracking code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            >
              <option value="all">All</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="invoice_number">Invoice Number</option>
              <option value="due_date">Due Date</option>
              <option value="amount_high">Amount (High to Low)</option>
              <option value="amount_low">Amount (Low to High)</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      {filteredAndSortedInvoices.length === 0 ? (
        <EmptyStates.NoInvoices
          portal="shipper"
          title={searchQuery || filter !== 'all' ? 'No invoices match your filters' : 'No invoices found'}
          description={searchQuery || filter !== 'all'
            ? 'Try adjusting your search or filter criteria'
            : 'Invoices will appear here once loads are completed'}
        />
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-slate-400 mb-2">
            Showing {filteredAndSortedInvoices.length} of {invoices.length} invoices
          </div>
          {filteredAndSortedInvoices.map((invoice) => (
            <div key={invoice.id} className="glass-primary p-6 rounded-xl border border-slate-700/50 hover:border-slate-600/50 hover:shadow-lg transition-all shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-xl font-bold text-white hover:text-cyan-400 transition-colors font-data">{invoice.invoiceNumber}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-400">
                    <div>
                      <span className="font-medium text-slate-300">Date:</span> {formatDate(invoice.invoiceDate)}
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Due:</span> {formatDate(invoice.dueDate)}
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Loads:</span> {invoice.loadRequests.length}
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Total:</span> <span className="font-bold text-white font-data">{formatCurrency(invoice.total)}</span>
                    </div>
                  </div>
                  {invoice.loadRequests.length > 0 && (
                    <div className="mt-3 text-sm text-slate-500">
                      Tracking Codes: {invoice.loadRequests.map((l) => l.publicTrackingCode).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-6">
                  <button
                    onClick={() => downloadPDF(invoice.id, invoice.invoiceNumber)}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-medium hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
