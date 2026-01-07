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
        // Fetch all documents for this shipper's loads
        fetchDocuments(data.user.id)
      } catch (error) {
        console.error('Error fetching shipper data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchShipperData()
  }, [])

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight print:text-2xl">Documents & Invoices</h1>
        <p className="text-slate-400 text-sm md:text-base print:text-sm">View and download Bill of Lading, invoices, and proof of delivery</p>
      </div>

      {/* Filters and Search */}
      <div className="glass-primary p-4 rounded-xl mb-6 border border-slate-700/50 shadow-lg">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by title, tracking code, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Filter by Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Type</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
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
            <label className="block text-sm font-medium text-slate-300 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
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
        <div className="glass-primary rounded-xl p-12 text-center border border-slate-700/50 shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 text-slate-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {searchQuery || filter !== 'all' ? 'No documents match your filters' : 'No documents yet'}
          </h3>
          <p className="text-slate-400">
            {searchQuery || filter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Documents uploaded by drivers or yourself will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-slate-400 mb-2">
            Showing {filteredAndSortedDocuments.length} of {documents.length} documents
          </div>
          {filteredAndSortedDocuments.map((doc) => (
            <div key={doc.id} className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1 truncate">{doc.title}</h3>
                    <p className="text-sm text-slate-400">
                      Load: <span className="font-mono text-cyan-400 font-data">{doc.loadRequest?.publicTrackingCode}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
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
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 flex-shrink-0 ml-4"
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

