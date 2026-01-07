'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { showToast, showApiError } from '@/lib/toast'

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
  paymentMethod: string | null
  paymentReference: string | null
  shipper: {
    id: string
    companyName: string
    email: string
  }
  loadRequests: Array<{
    publicTrackingCode: string
  }>
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-700/50 text-slate-300 border border-slate-600/50',
  SENT: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  PAID: 'bg-green-500/20 text-green-400 border border-green-500/30',
  OVERDUE: 'bg-red-500/20 text-red-400 border border-red-500/30',
  CANCELLED: 'bg-slate-700/50 text-slate-400 border border-slate-600/50',
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
}

type SortField = 'newest' | 'oldest' | 'invoice_number' | 'due_date' | 'amount_high' | 'amount_low' | 'status' | 'company'

export default function AdminInvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortField>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState({
    paymentMethod: '',
    paymentReference: '',
  })
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'CREDIT' as 'CREDIT' | 'DEBIT' | 'DISPUTE_RESOLUTION' | 'CORRECTION',
    amount: '',
    reason: '',
    notes: '',
  })
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchData, setBatchData] = useState({
    shipperId: '',
    paymentTermsDays: 14,
    taxRate: 0,
  })
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false)
  const [invoiceAdjustments, setInvoiceAdjustments] = useState<Record<string, any[]>>({})

  useEffect(() => {
    const adminData = localStorage.getItem('admin')
    if (!adminData) {
      router.push('/admin/login')
      return
    }

    fetchInvoices()
  }, [router])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices')
      if (!response.ok) throw new Error('Failed to fetch invoices')

      const data = await response.json()
      setInvoices(data.invoices || [])
      
      // Fetch adjustments for each invoice
      const adjustmentsMap: Record<string, any[]> = {}
      for (const invoice of data.invoices || []) {
        try {
          const adjResponse = await fetch(`/api/invoices/${invoice.id}/adjustments`)
          if (adjResponse.ok) {
            const adjData = await adjResponse.json()
            adjustmentsMap[invoice.id] = adjData.adjustments || []
          }
        } catch (err) {
          console.error(`Error fetching adjustments for invoice ${invoice.id}:`, err)
        }
      }
      setInvoiceAdjustments(adjustmentsMap)
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort invoices
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices

    // Filter by status
    if (filter === 'outstanding') {
      filtered = filtered.filter((invoice) => invoice.status === 'SENT' || invoice.status === 'OVERDUE')
    } else if (filter !== 'all') {
      filtered = filtered.filter((invoice) => invoice.status === filter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          invoice.shipper.companyName.toLowerCase().includes(query) ||
          invoice.shipper.email.toLowerCase().includes(query) ||
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
        case 'company':
          return a.shipper.companyName.localeCompare(b.shipper.companyName)
        default:
          return 0
      }
    })

    return sorted
  }, [invoices, filter, searchQuery, sortBy])

  const markAsSent = async (invoiceId: string) => {
    try {
      // First update status, then send email
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })

      if (response.ok) {
        // Send invoice email
        const sendResponse = await fetch(`/api/invoices/${invoiceId}/send`, {
          method: 'POST',
        })

        if (sendResponse.ok) {
          await fetchInvoices()
          showToast.success('Invoice marked as sent and email sent to shipper!')
        } else {
          await fetchInvoices()
          showToast.warning('Invoice marked as sent', 'But email failed to send. Please send manually.')
        }
      } else {
        showToast.error('Failed to update invoice')
      }
    } catch (error) {
      console.error('Error marking invoice as sent:', error)
      showApiError(error, 'Failed to update invoice')
    }
  }

  const markAsPaid = async () => {
    if (!selectedInvoice) return

    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAID',
          paymentMethod: paymentData.paymentMethod,
          paymentReference: paymentData.paymentReference,
        }),
      })

      if (response.ok) {
        await fetchInvoices()
        setShowPaymentModal(false)
        setSelectedInvoice(null)
        setPaymentData({ paymentMethod: '', paymentReference: '' })
        showToast.success('Invoice marked as paid!')
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error)
      showApiError(error, 'Failed to update invoice')
    }
  }

  const downloadPDF = (invoiceId: string, invoiceNumber: string) => {
    window.open(`/api/invoices/${invoiceId}/pdf`, '_blank')
  }

  const handleCreateAdjustment = async () => {
    if (!selectedInvoice || !adjustmentData.amount || !adjustmentData.reason) return

    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.id}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: adjustmentData.type,
          amount: parseFloat(adjustmentData.amount),
          reason: adjustmentData.reason,
          notes: adjustmentData.notes || undefined,
        }),
      })

      if (response.ok) {
        await fetchInvoices()
        setShowAdjustmentModal(false)
        setSelectedInvoice(null)
        setAdjustmentData({ type: 'CREDIT', amount: '', reason: '', notes: '' })
        showToast.success('Adjustment created successfully!')
      } else {
        const data = await response.json()
        throw new Error(data.message || 'Failed to create adjustment')
      }
    } catch (error) {
      console.error('Error creating adjustment:', error)
      showApiError(error, 'Failed to create adjustment')
    }
  }

  const handleBatchGenerate = async () => {
    try {
      setIsGeneratingBatch(true)
      const response = await fetch('/api/invoices/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipperId: batchData.shipperId || undefined,
          paymentTermsDays: batchData.paymentTermsDays,
          taxRate: batchData.taxRate / 100, // Convert percentage to decimal
        }),
      })

      if (response.ok) {
        const data = await response.json()
        await fetchInvoices()
        setShowBatchModal(false)
        setBatchData({ shipperId: '', paymentTermsDays: 14, taxRate: 0 })
        showToast.success(`Successfully generated ${data.invoicesGenerated} invoice(s)!`)
      } else {
        const data = await response.json()
        throw new Error(data.message || 'Failed to generate batch invoices')
      }
    } catch (error) {
      console.error('Error generating batch invoices:', error)
      showApiError(error, 'Failed to generate batch invoices')
    } finally {
      setIsGeneratingBatch(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading invoices...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
              Invoice Management
            </h1>
            <p className="text-slate-400">View and manage all invoices</p>
          </div>
          <button
            onClick={() => setShowBatchModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Batch Generate
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
          <div className="text-3xl font-bold text-white mb-1 font-data">{invoices.length}</div>
          <div className="text-sm text-slate-400">Total Invoices</div>
        </div>
        <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
          <div className="text-3xl font-bold text-white mb-1 font-data">
            {invoices.filter((i) => i.status === 'SENT').length}
          </div>
          <div className="text-sm text-slate-400">Sent</div>
        </div>
        <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
          <div className="text-3xl font-bold text-white mb-1 font-data">
            {invoices.filter((i) => i.status === 'OVERDUE').length}
          </div>
          <div className="text-sm text-slate-400">Overdue</div>
        </div>
        <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
          <div className="text-3xl font-bold text-white mb-1 font-data">
            {invoices.filter((i) => i.status === 'PAID').length}
          </div>
          <div className="text-sm text-slate-400">Paid</div>
        </div>
      </div>

      {/* Filters, Search, and Sort */}
      <div className="glass-primary p-4 rounded-xl mb-6 border border-slate-700/50 shadow-lg">
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by invoice number, company, tracking code..."
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
              <option value="outstanding">Outstanding</option>
              <option value="OVERDUE">Overdue</option>
              <option value="PAID">Paid</option>
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
              <option value="company">Company Name</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'DRAFT', label: 'Draft' },
            { key: 'SENT', label: 'Sent' },
            { key: 'outstanding', label: 'Outstanding' },
            { key: 'OVERDUE', label: 'Overdue' },
            { key: 'PAID', label: 'Paid' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                filter === key
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-600/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List */}
      {filteredAndSortedInvoices.length === 0 ? (
        <div className="glass-primary rounded-xl p-12 text-center border border-slate-700/50 shadow-lg">
          <svg
            className="w-16 h-16 text-slate-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">
            {searchQuery || filter !== 'all' ? 'No invoices match your filters' : 'No invoices found'}
          </h3>
          <p className="text-slate-400">
            {searchQuery || filter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Invoices will appear here after they are created'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-slate-400 mb-2">
            Showing {filteredAndSortedInvoices.length} of {invoices.length} invoices
          </div>
          {filteredAndSortedInvoices.map((invoice) => (
            <div key={invoice.id} className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg hover:border-slate-600/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-white text-lg font-data">{invoice.invoiceNumber}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        INVOICE_STATUS_COLORS[invoice.status] || INVOICE_STATUS_COLORS.DRAFT
                      }`}
                    >
                      {INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">Client: <span className="text-white">{invoice.shipper.companyName}</span></p>
                  <p className="text-sm text-slate-400">
                    Invoice Date: {formatDate(invoice.invoiceDate)} | Due: {formatDate(invoice.dueDate)}
                  </p>
                  {invoice.paidAt && (
                    <p className="text-sm text-green-400 mt-1">
                      Paid: {formatDate(invoice.paidAt)}
                      {invoice.paymentMethod && ` via ${invoice.paymentMethod}`}
                      {invoice.paymentReference && ` (${invoice.paymentReference})`}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-white mb-2 font-data">
                    {formatCurrency(invoice.total)}
                  </div>
                  <div className="flex gap-2 flex-col">
                    <button
                      onClick={() => downloadPDF(invoice.id, invoice.invoiceNumber)}
                      className="px-3 py-1 text-sm bg-slate-700/50 text-slate-200 rounded hover:bg-slate-700 transition-colors border border-slate-600/50"
                    >
                      PDF
                    </button>
                    {invoice.status === 'DRAFT' && (
                      <button
                        onClick={() => markAsSent(invoice.id)}
                        className="px-3 py-1 text-sm bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors border border-blue-500/30"
                      >
                        Mark Sent
                      </button>
                    )}
                    {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice)
                          setShowPaymentModal(true)
                        }}
                        className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors border border-green-500/30"
                      >
                        Mark Paid
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedInvoice(invoice)
                        setShowAdjustmentModal(true)
                      }}
                      className="px-3 py-1 text-sm bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition-colors border border-yellow-500/30"
                      title="Add Adjustment"
                    >
                      Adjust
                    </button>
                  </div>
                </div>
              </div>

              {/* Loads */}
              {invoice.loadRequests.length > 0 && (
                <div className="pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500">
                    Loads: {invoice.loadRequests.map((l) => l.publicTrackingCode).join(', ')}
                  </p>
                </div>
              )}

              {/* Adjustments */}
              {invoiceAdjustments[invoice.id] && invoiceAdjustments[invoice.id].length > 0 && (
                <div className="pt-4 border-t border-slate-700/50 mt-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">Adjustments:</p>
                  <div className="space-y-2">
                    {invoiceAdjustments[invoice.id].map((adj: any) => (
                      <div key={adj.id} className="text-xs bg-slate-800/50 rounded p-2 border border-slate-700/50">
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${
                            adj.type === 'CREDIT' ? 'text-green-400' : 
                            adj.type === 'DEBIT' ? 'text-red-400' : 
                            'text-yellow-400'
                          }`}>
                            {adj.type.replace(/_/g, ' ')}
                          </span>
                          <span className={`font-mono font-bold ${
                            adj.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {adj.amount > 0 ? '+' : ''}{formatCurrency(adj.amount)}
                          </span>
                        </div>
                        <p className="text-slate-400 mt-1">{adj.reason}</p>
                        {adj.notes && (
                          <p className="text-slate-500 mt-1 italic">{adj.notes}</p>
                        )}
                        <p className="text-slate-500 mt-1 text-[10px]">
                          {formatDate(adj.createdAt)} by {adj.createdByType}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-primary rounded-xl p-6 max-w-md w-full border border-slate-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-4 font-heading">
              Mark Invoice as Paid
            </h2>
            <p className="text-slate-400 mb-4">
              Invoice: <span className="font-mono font-bold text-white font-data">{selectedInvoice.invoiceNumber}</span>
            </p>
            <p className="text-slate-400 mb-6">
              Amount: <span className="font-bold text-white font-data">{formatCurrency(selectedInvoice.total)}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                  required
                >
                  <option value="">Select payment method</option>
                  <option value="ACH">ACH</option>
                  <option value="CHECK">Check</option>
                  <option value="WIRE">Wire Transfer</option>
                  <option value="STRIPE_ACH">Stripe ACH</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentData.paymentReference}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentReference: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="Check number, ACH confirmation, etc."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={markAsPaid}
                disabled={!paymentData.paymentMethod}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 shadow-lg shadow-green-500/30"
              >
                Mark Paid
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedInvoice(null)
                  setPaymentData({ paymentMethod: '', paymentReference: '' })
                }}
                className="px-4 py-2 bg-slate-700/50 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 transition-colors border border-slate-600/50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdjustmentModal(false)}>
          <div className="glass-primary rounded-xl p-8 max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4 font-heading">Add Invoice Adjustment</h2>
            <p className="text-slate-400 mb-6">
              Invoice: <span className="font-mono font-bold text-white font-data">{selectedInvoice.invoiceNumber}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Adjustment Type *</label>
                <select
                  value={adjustmentData.type}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, type: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                >
                  <option value="CREDIT">Credit (Reduce Amount)</option>
                  <option value="DEBIT">Debit (Increase Amount)</option>
                  <option value="DISPUTE_RESOLUTION">Dispute Resolution</option>
                  <option value="CORRECTION">Correction</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={adjustmentData.amount}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, amount: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Reason *</label>
                <input
                  type="text"
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="Brief reason for adjustment"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Notes (Optional)</label>
                <textarea
                  value={adjustmentData.notes}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500 resize-none"
                  placeholder="Additional details..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowAdjustmentModal(false)
                  setSelectedInvoice(null)
                  setAdjustmentData({ type: 'CREDIT', amount: '', reason: '', notes: '' })
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 transition-colors border border-slate-600/50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAdjustment}
                disabled={!adjustmentData.amount || !adjustmentData.reason}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-yellow-500/50 transition-all disabled:opacity-50 shadow-lg shadow-yellow-500/30"
              >
                Create Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Generate Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowBatchModal(false)}>
          <div className="glass-primary rounded-xl p-8 max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4 font-heading">Batch Generate Invoices</h2>
            <p className="text-slate-400 mb-6">Generate invoices for all completed loads that haven't been invoiced</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Shipper (Optional)</label>
                <input
                  type="text"
                  value={batchData.shipperId}
                  onChange={(e) => setBatchData({ ...batchData, shipperId: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="Leave empty for all shippers"
                />
                <p className="text-xs text-slate-500 mt-1">Leave empty to generate for all shippers</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Payment Terms (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={batchData.paymentTermsDays}
                  onChange={(e) => setBatchData({ ...batchData, paymentTermsDays: parseInt(e.target.value) || 14 })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={batchData.taxRate}
                  onChange={(e) => setBatchData({ ...batchData, taxRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowBatchModal(false)
                  setBatchData({ shipperId: '', paymentTermsDays: 14, taxRate: 0 })
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 transition-colors border border-slate-600/50"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchGenerate}
                disabled={isGeneratingBatch}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/30"
              >
                {isGeneratingBatch ? 'Generating...' : 'Generate Invoices'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

