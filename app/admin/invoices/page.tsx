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
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  SENT: 'bg-blue-100 text-blue-700 border-blue-300',
  PAID: 'bg-green-100 text-green-700 border-green-300',
  OVERDUE: 'bg-red-100 text-red-700 border-red-300',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-300',
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

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoices...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Invoice Management</h1>
        <p className="text-gray-600">View and manage all invoices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-primary rounded-xl p-6 border-2 border-blue-200/30 shadow-glass">
          <div className="text-3xl font-bold text-gray-900 mb-1">{invoices.length}</div>
          <div className="text-sm text-gray-600">Total Invoices</div>
        </div>
        <div className="glass-primary rounded-xl p-6 border-2 border-blue-200/30 shadow-glass">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {invoices.filter((i) => i.status === 'SENT').length}
          </div>
          <div className="text-sm text-gray-600">Sent</div>
        </div>
        <div className="glass-primary rounded-xl p-6 border-2 border-blue-200/30 shadow-glass">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {invoices.filter((i) => i.status === 'OVERDUE').length}
          </div>
          <div className="text-sm text-gray-600">Overdue</div>
        </div>
        <div className="glass-primary rounded-xl p-6 border-2 border-blue-200/30 shadow-glass">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {invoices.filter((i) => i.status === 'PAID').length}
          </div>
          <div className="text-sm text-gray-600">Paid</div>
        </div>
      </div>

      {/* Filters, Search, and Sort */}
      <div className="glass-primary p-4 rounded-xl mb-6 border-2 border-blue-200/30 shadow-glass">
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by invoice number, company, tracking code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
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
                  ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg'
                  : 'bg-white/40 text-gray-700 hover:bg-white/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List */}
      {filteredAndSortedInvoices.length === 0 ? (
        <div className="glass-primary rounded-2xl p-12 text-center border-2 border-blue-200/30 shadow-glass">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchQuery || filter !== 'all' ? 'No invoices match your filters' : 'No invoices found'}
          </h3>
          <p className="text-gray-600">
            {searchQuery || filter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Invoices will appear here after they are created'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-2">
            Showing {filteredAndSortedInvoices.length} of {invoices.length} invoices
          </div>
          {filteredAndSortedInvoices.map((invoice) => (
            <div key={invoice.id} className="glass-primary rounded-xl p-6 border-2 border-blue-200/30 shadow-glass">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">{invoice.invoiceNumber}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        INVOICE_STATUS_COLORS[invoice.status] || INVOICE_STATUS_COLORS.DRAFT
                      }`}
                    >
                      {INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Client: {invoice.shipper.companyName}</p>
                  <p className="text-sm text-gray-600">
                    Invoice Date: {formatDate(invoice.invoiceDate)} | Due: {formatDate(invoice.dueDate)}
                  </p>
                  {invoice.paidAt && (
                    <p className="text-sm text-green-600 mt-1">
                      Paid: {formatDate(invoice.paidAt)}
                      {invoice.paymentMethod && ` via ${invoice.paymentMethod}`}
                      {invoice.paymentReference && ` (${invoice.paymentReference})`}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatCurrency(invoice.total)}
                  </div>
                  <div className="flex gap-2 flex-col">
                    <button
                      onClick={() => downloadPDF(invoice.id, invoice.invoiceNumber)}
                      className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                    >
                      PDF
                    </button>
                    {invoice.status === 'DRAFT' && (
                      <button
                        onClick={() => markAsSent(invoice.id)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
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
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Loads */}
              {invoice.loadRequests.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Loads: {invoice.loadRequests.map((l) => l.publicTrackingCode).join(', ')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Mark Invoice as Paid
            </h2>
            <p className="text-gray-600 mb-4">
              Invoice: <span className="font-mono font-bold">{selectedInvoice.invoiceNumber}</span>
            </p>
            <p className="text-gray-600 mb-6">
              Amount: <span className="font-bold">{formatCurrency(selectedInvoice.total)}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentData.paymentReference}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentReference: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Check number, ACH confirmation, etc."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={markAsPaid}
                disabled={!paymentData.paymentMethod}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50"
              >
                Mark Paid
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedInvoice(null)
                  setPaymentData({ paymentMethod: '', paymentReference: '' })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

