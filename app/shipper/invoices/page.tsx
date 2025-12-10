'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Invoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  subtotal: number
  tax: number
  total: number
  status: string
  paidAt: string | null
  paymentMethod: string | null
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

export default function ShipperInvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    const parsedShipper = JSON.parse(shipperData)
    fetchInvoices(parsedShipper.id)
  }, [router])

  const fetchInvoices = async (shipperId: string) => {
    try {
      const response = await fetch(`/api/invoices?shipperId=${shipperId}`)
      if (!response.ok) throw new Error('Failed to fetch invoices')

      const data = await response.json()
      setInvoices(data.invoices || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    if (filter === 'all') return true
    if (filter === 'outstanding') return invoice.status === 'SENT' || invoice.status === 'OVERDUE'
    if (filter === 'paid') return invoice.status === 'PAID'
    return invoice.status === filter
  })

  const stats = {
    total: invoices.length,
    outstanding: invoices.filter((i) => i.status === 'SENT' || i.status === 'OVERDUE').length,
    paid: invoices.filter((i) => i.status === 'PAID').length,
    overdue: invoices.filter((i) => i.status === 'OVERDUE').length,
    totalOutstanding: invoices
      .filter((i) => i.status === 'SENT' || i.status === 'OVERDUE')
      .reduce((sum, i) => sum + i.total, 0),
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Invoices</h1>
        <p className="text-gray-600">View and download your invoices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Invoices</div>
        </div>
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-blue-600 mb-1">{stats.outstanding}</div>
          <div className="text-sm text-gray-600">Outstanding</div>
        </div>
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-green-600 mb-1">{stats.paid}</div>
          <div className="text-sm text-gray-600">Paid</div>
        </div>
        <div className="glass rounded-xl p-6">
          <div className="text-3xl font-bold text-red-600 mb-1">{formatCurrency(stats.totalOutstanding)}</div>
          <div className="text-sm text-gray-600">Outstanding Amount</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'outstanding', label: 'Outstanding' },
          { key: 'paid', label: 'Paid' },
          { key: 'SENT', label: 'Sent' },
          { key: 'OVERDUE', label: 'Overdue' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
              filter === key
                ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-lg'
                : 'glass text-gray-700 hover:bg-white/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
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
          <h3 className="text-xl font-bold text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? 'Invoices will appear here after loads are delivered and invoiced'
              : 'No invoices match this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="glass rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
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
                  <p className="text-sm text-gray-600">
                    Invoice Date: {formatDate(invoice.invoiceDate)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Due Date: {formatDate(invoice.dueDate)}
                  </p>
                  {invoice.paidAt && (
                    <p className="text-sm text-green-600 mt-1">
                      Paid: {formatDate(invoice.paidAt)}
                      {invoice.paymentMethod && ` via ${invoice.paymentMethod}`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatCurrency(invoice.total)}
                  </div>
                  <button
                    onClick={() => downloadPDF(invoice.id, invoice.invoiceNumber)}
                    className="text-sm text-slate-600 hover:text-slate-700 font-medium"
                  >
                    Download PDF
                  </button>
                </div>
              </div>

              {/* Loads included in invoice */}
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
    </div>
  )
}

