'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DocumentViewButton from '@/components/features/DocumentViewButton'
import { formatDate } from '@/lib/utils'

type SortField = 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'type' | 'tracking_code' | 'file_size'

export default function DocumentsPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('newest')

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    const parsedShipper = JSON.parse(shipperData)
    setShipper(parsedShipper)
    
    // Fetch all documents for this shipper's loads
    fetchDocuments(parsedShipper.id)
  }, [router])

  const fetchDocuments = async (shipperId: string) => {
    try {
      const response = await fetch(`/api/shippers/${shipperId}/documents`)
      if (!response.ok) throw new Error('Failed to fetch documents')

      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents

    // Filter by type
    if (filter !== 'all') {
      filtered = filtered.filter((doc) => doc.type === filter)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (doc) =>
          doc.title?.toLowerCase().includes(query) ||
          doc.loadRequest?.publicTrackingCode?.toLowerCase().includes(query) ||
          doc.type?.toLowerCase().includes(query) ||
          doc.uploadedBy?.toLowerCase().includes(query)
      )
    }

    // Sort documents
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '')
        case 'title_desc':
          return (b.title || '').localeCompare(a.title || '')
        case 'type':
          return (a.type || '').localeCompare(b.type || '')
        case 'tracking_code':
          return (a.loadRequest?.publicTrackingCode || '').localeCompare(b.loadRequest?.publicTrackingCode || '')
        case 'file_size':
          const aSize = a.fileSize || 0
          const bSize = b.fileSize || 0
          return bSize - aSize
        default:
          return 0
      }
    })

    return sorted
  }, [documents, filter, searchQuery, sortBy])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      <div className="sticky top-[73px] z-30 bg-gradient-medical-bg pt-8 pb-4 mb-8 print:mb-4 print:static print:top-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">Documents & Invoices</h1>
            <p className="text-gray-600 print:text-sm">View and download Bill of Lading, invoices, and proof of delivery</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="glass-primary p-4 rounded-xl mb-6 border-2 border-blue-200/30 shadow-glass">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by title, tracking code, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
            />
          </div>

          {/* Filter by Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
            >
              <option value="all">All Types</option>
              <option value="PROOF_OF_PICKUP">Proof of Pickup</option>
              <option value="PROOF_OF_DELIVERY">Proof of Delivery</option>
              <option value="BILL_OF_LADING">Bill of Lading</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50/60"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="title_desc">Title (Z-A)</option>
              <option value="type">Type</option>
              <option value="tracking_code">Tracking Code</option>
              <option value="file_size">File Size (Largest)</option>
            </select>
          </div>
        </div>
      </div>

      {filteredAndSortedDocuments.length === 0 ? (
        <div className="glass-primary rounded-2xl p-12 text-center border-2 border-blue-200/30 shadow-glass">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchQuery || filter !== 'all' ? 'No documents match your filters' : 'No documents yet'}
          </h3>
          <p className="text-gray-600">
            {searchQuery || filter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Documents uploaded by drivers or yourself will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-2">
            Showing {filteredAndSortedDocuments.length} of {documents.length} documents
          </div>
          {filteredAndSortedDocuments.map((doc) => (
            <div key={doc.id} className="glass-primary rounded-xl p-6 border-2 border-blue-200/30 shadow-glass">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{doc.title}</h3>
                    <p className="text-sm text-gray-600">
                      Load: <span className="font-mono">{doc.loadRequest?.publicTrackingCode}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {doc.type.replace(/_/g, ' ')} • {formatDate(doc.createdAt)}
                      {doc.uploadedBy && ` • Uploaded by ${doc.uploadedBy}`}
                      {doc.fileSize && ` • ${(doc.fileSize / 1024).toFixed(2)} KB`}
                    </p>
                  </div>
                </div>
                <DocumentViewButton 
                  url={doc.url}
                  title={doc.title}
                  type={doc.type}
                  className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all shadow-lg flex-shrink-0 ml-4"
                >
                  View/Download
                </DocumentViewButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

