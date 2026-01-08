'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  notes: string | null
  shipper: {
    id: string
    companyName: string
    email: string
    contactName: string
    phone: string
    billingAddressLine1: string | null
    billingAddressLine2: string | null
    billingCity: string | null
    billingState: string | null
    billingPostalCode: string | null
  }
  loadRequests: Array<{
    id: string
    publicTrackingCode: string
    status: string
    quoteAmount: number | null
    createdAt: string
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
  }>
  adjustments: Array<{
    id: string
    type: string
    amount: number
    reason: string
    notes: string | null
    createdBy: string
    createdByType: string
    createdAt: string
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

export default function InvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [paymentData, setPaymentData] = useState({
    paymentMethod: '',
    paymentReference: '',
  })
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'CREDIT' as 'CREDIT' | 'DEBIT' | 'DISPUTE_RESOLUTION' | 'CORRECTION',
    amount: '',
    reason: '',
    notes: '',
  })

  useEffect(() => {
    fetchInvoice()
  }, [invoiceId])

  const fetchInvoice = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/invoices/${invoiceId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Invoice not found')
        }
        throw new Error('Failed to fetch invoice')
      }

      const data = await response.json()
      setInvoice(data)
    } catch (err) {
      console.error('Error fetching invoice:', err)
      setError(err instanceof Error ? err.message : 'Failed to load invoice')
    } finally {
      setIsLoading(false)
    }
  }

  const markAsSent = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })

      if (response.ok) {
        const sendResponse = await fetch(`/api/invoices/${invoiceId}/send`, {
          method: 'POST',
        })

        if (sendResponse.ok) {
          await fetchInvoice()
          showToast.success('Invoice marked as sent and email sent!')
        } else {
          await fetchInvoice()
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
    if (!paymentData.paymentMethod) {
      showToast.warning('Please select a payment method')
      return
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAID',
          paymentMethod: paymentData.paymentMethod,
          paymentReference: paymentData.paymentReference || null,
          paidAt: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        await fetchInvoice()
        setShowPaymentModal(false)
        setPaymentData({ paymentMethod: '', paymentReference: '' })
        showToast.success('Invoice marked as paid!')
      } else {
        showToast.error('Failed to update invoice')
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error)
      showApiError(error, 'Failed to update invoice')
    }
  }

  const handleCreateAdjustment = async () => {
    if (!adjustmentData.amount || !adjustmentData.reason) {
      showToast.warning('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/adjustments`, {
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
        await fetchInvoice()
        setShowAdjustmentModal(false)
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

  const downloadPDF = () => {
    window.open(`/api/invoices/${invoiceId}/pdf`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading invoice...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="p-8">
        <div className="glass-primary rounded-xl p-8 border border-slate-700/50 shadow-lg text-center">
          <p className="text-red-400 mb-4">{error || 'Invoice not found'}</p>
          <Link
            href="/admin/invoices"
            className="inline-block px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all"
          >
            Back to Invoices
          </Link>
        </div>
      </div>
    )
  }

  const adjustmentTotal = invoice.adjustments.reduce((sum, adj) => sum + adj.amount, 0)
  const finalTotal = invoice.subtotal + invoice.tax + adjustmentTotal

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link
              href="/admin/invoices"
              className="text-cyan-400 hover:text-cyan-300 mb-2 inline-flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Invoices
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-slate-400">Invoice details and payment tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadPDF}
              className="px-4 py-2 bg-slate-700/50 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 border border-slate-600/50 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF
            </button>
            {invoice.status === 'DRAFT' && (
              <button
                onClick={markAsSent}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-semibold hover:bg-blue-500/30 border border-blue-500/30 transition-colors"
              >
                Mark as Sent
              </button>
            )}
            {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-semibold hover:bg-green-500/30 border border-green-500/30 transition-colors"
              >
                Mark as Paid
              </button>
            )}
            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-semibold hover:bg-yellow-500/30 border border-yellow-500/30 transition-colors"
            >
              Add Adjustment
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content - Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Header */}
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Invoice Details</h2>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${INVOICE_STATUS_COLORS[invoice.status] || INVOICE_STATUS_COLORS.DRAFT}`}>
                    {INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
                  </span>
                  {invoice.status === 'OVERDUE' && new Date(invoice.dueDate) < new Date() && (
                    <span className="text-red-400 text-sm font-medium">
                      {Math.floor((new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white mb-1 font-data">{formatCurrency(finalTotal)}</p>
                <p className="text-sm text-slate-400">Total Amount</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-slate-400 mb-1">Invoice Number</p>
                <p className="font-mono font-bold text-white font-data">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Invoice Date</p>
                <p className="font-semibold text-white">{formatDate(invoice.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Due Date</p>
                <p className={`font-semibold ${new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID' ? 'text-red-400' : 'text-white'}`}>
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
              {invoice.paidAt && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Paid Date</p>
                  <p className="font-semibold text-white">{formatDate(invoice.paidAt)}</p>
                </div>
              )}
            </div>

            {invoice.notes && (
              <div className="pt-4 border-t border-slate-700/50">
                <p className="text-sm text-slate-400 mb-1">Notes</p>
                <p className="text-white">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Loads */}
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">Associated Loads ({invoice.loadRequests.length})</h3>
            {invoice.loadRequests.length === 0 ? (
              <p className="text-slate-400">No loads associated with this invoice</p>
            ) : (
              <div className="space-y-3">
                {invoice.loadRequests.map((load) => (
                  <Link
                    key={load.id}
                    href={`/admin/loads/${load.id}`}
                    className="block p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-cyan-400 font-data">{load.publicTrackingCode}</p>
                        <p className="text-sm text-slate-300">
                          {load.pickupFacility.city}, {load.pickupFacility.state} → {load.dropoffFacility.city}, {load.dropoffFacility.state}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(load.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        {load.quoteAmount && (
                          <p className="font-bold text-white font-data">{formatCurrency(load.quoteAmount)}</p>
                        )}
                        <span className="text-xs text-slate-400">{load.status}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Adjustments */}
          {invoice.adjustments.length > 0 && (
            <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-4">Adjustments ({invoice.adjustments.length})</h3>
              <div className="space-y-3">
                {invoice.adjustments.map((adj) => (
                  <div key={adj.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold ${
                        adj.type === 'CREDIT' ? 'text-green-400' : 
                        adj.type === 'DEBIT' ? 'text-red-400' : 
                        'text-yellow-400'
                      }`}>
                        {adj.type.replace(/_/g, ' ')}
                      </span>
                      <span className={`font-mono font-bold font-data ${adj.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {adj.amount > 0 ? '+' : ''}{formatCurrency(adj.amount)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mb-1">{adj.reason}</p>
                    {adj.notes && (
                      <p className="text-sm text-slate-400 italic">{adj.notes}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      {formatDate(adj.createdAt)} by {adj.createdByType}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Right 1/3 */}
        <div className="space-y-6">
          {/* Shipper Information */}
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">Shipper Information</h3>
            <div className="space-y-3">
              <div>
                <Link
                  href={`/admin/shippers/${invoice.shipper.id}`}
                  className="font-bold text-white hover:text-cyan-400 transition-colors"
                >
                  {invoice.shipper.companyName}
                </Link>
              </div>
              <div>
                <p className="text-sm text-slate-400">Contact</p>
                <p className="text-white">{invoice.shipper.contactName}</p>
                <p className="text-slate-300 text-sm">{invoice.shipper.email}</p>
                <p className="text-slate-300 text-sm">{invoice.shipper.phone}</p>
              </div>
              {(invoice.shipper.billingAddressLine1 || invoice.shipper.billingCity) && (
                <div>
                  <p className="text-sm text-slate-400">Billing Address</p>
                  <p className="text-white text-sm">
                    {invoice.shipper.billingAddressLine1}
                    {invoice.shipper.billingAddressLine2 && <><br />{invoice.shipper.billingAddressLine2}</>}
                    <br />
                    {invoice.shipper.billingCity}, {invoice.shipper.billingState} {invoice.shipper.billingPostalCode}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-white font-data">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Tax</span>
                <span className="text-white font-data">{formatCurrency(invoice.tax)}</span>
              </div>
              {adjustmentTotal !== 0 && (
                <div className="flex justify-between text-sm pt-2 border-t border-slate-700/50">
                  <span className="text-slate-400">Adjustments</span>
                  <span className={`font-data ${adjustmentTotal > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {adjustmentTotal > 0 ? '+' : ''}{formatCurrency(adjustmentTotal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-700/50">
                <span className="font-semibold text-white">Total</span>
                <span className="font-bold text-white font-data">{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            {invoice.status === 'PAID' && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-sm text-slate-400 mb-1">Payment Method</p>
                <p className="text-white font-semibold">{invoice.paymentMethod || 'N/A'}</p>
                {invoice.paymentReference && (
                  <>
                    <p className="text-sm text-slate-400 mt-2 mb-1">Payment Reference</p>
                    <p className="text-white font-mono text-sm">{invoice.paymentReference}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="glass-primary rounded-xl p-8 max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">Mark Invoice as Paid</h2>
            <p className="text-slate-400 mb-6">
              Invoice: <span className="font-mono font-bold text-white font-data">{invoice.invoiceNumber}</span>
              <br />
              Amount: <span className="font-bold text-white font-data">{formatCurrency(finalTotal)}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Payment Method *</label>
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
                <label className="block text-sm font-semibold text-slate-300 mb-2">Payment Reference (Optional)</label>
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
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 border border-slate-600/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={markAsPaid}
                disabled={!paymentData.paymentMethod}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-green-500/50 transition-all disabled:opacity-50 shadow-lg shadow-green-500/30"
              >
                Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdjustmentModal(false)}>
          <div className="glass-primary rounded-xl p-8 max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">Add Invoice Adjustment</h2>
            <p className="text-slate-400 mb-6">
              Invoice: <span className="font-mono font-bold text-white font-data">{invoice.invoiceNumber}</span>
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
    </div>
  )
}

