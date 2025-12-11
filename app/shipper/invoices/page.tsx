'use client'

// Shipper Invoices Page
// View and manage invoices

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  loadRequests: Array<{
    id: string
    publicTrackingCode: string
  }>
}

export default function ShipperInvoicesPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }
    setShipper(JSON.parse(shipperData))
    fetchInvoices()
  }, [router, filter])

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
        return 'bg-green-100 text-green-800 border-green-200'
      case 'SENT':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoices...</p>
        </div>
      </div>
    )
  }

  const filteredInvoices = invoices.filter((invoice) => {
    if (filter === 'all') return true
    return invoice.status === filter
  })

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === 'PAID').length,
    pending: invoices.filter((i) => ['DRAFT', 'SENT'].includes(i.status)).length,
    overdue: invoices.filter((i) => i.status === 'OVERDUE').length,
    totalAmount: invoices.reduce((sum, i) => sum + i.total, 0),
    paidAmount: invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + i.total, 0),
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Invoices</h1>
        <p className="text-gray-600">View and download your invoices</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="glass p-6 rounded-xl">
          <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Invoices</div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="text-3xl font-bold text-green-600 mb-1">{stats.paid}</div>
          <div className="text-sm text-gray-600">Paid</div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="text-3xl font-bold text-yellow-600 mb-1">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="text-3xl font-bold text-red-600 mb-1">{stats.overdue}</div>
          <div className="text-sm text-gray-600">Overdue</div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            ${stats.totalAmount.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Total Amount</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-4 rounded-xl mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 text-lg mb-2">No invoices found</p>
          <p className="text-gray-500 text-sm">Invoices will appear here once loads are completed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="glass p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{invoice.invoiceNumber}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Date:</span> {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Due:</span> {new Date(invoice.dueDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Loads:</span> {invoice.loadRequests.length}
                    </div>
                    <div>
                      <span className="font-medium">Total:</span> <span className="font-bold text-gray-900">${invoice.total.toFixed(2)}</span>
                    </div>
                  </div>
                  {invoice.loadRequests.length > 0 && (
                    <div className="mt-3 text-sm text-gray-500">
                      Tracking Codes: {invoice.loadRequests.map((l) => l.publicTrackingCode).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-6">
                  <button
                    onClick={() => downloadPDF(invoice.id, invoice.invoiceNumber)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
