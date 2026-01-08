'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import DocumentViewButton from '@/components/features/DocumentViewButton'
import { showToast } from '@/lib/toast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'

interface Document {
  id: string
  title: string
  type: string
  url: string
  mimeType: string | null
  fileSize: number | null
  uploadedBy: string | null
  createdAt: string
  isLocked?: boolean
  loadTrackingCode: string
  loadRequest: {
    id: string
    publicTrackingCode: string
    status: string
  }
}

type SortField = 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'type' | 'tracking_code' | 'file_size'

export default function DriverDocumentsPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('newest')

  useEffect(() => {
    // Get driver from API auth check (httpOnly cookie) - layout handles redirects
    const fetchDriverData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'driver') {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        setDriver(data.user)
        fetchDocuments(data.user.id)
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  const fetchDocuments = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/documents`)
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
          doc.title.toLowerCase().includes(query) ||
          doc.loadTrackingCode.toLowerCase().includes(query) ||
          doc.type.toLowerCase().includes(query) ||
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
          return (a.loadTrackingCode || '').localeCompare(b.loadTrackingCode || '')
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

  const getDocumentTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const handleDeleteDocument = async (documentId: string, loadRequestId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/load-requests/${loadRequestId}/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete document')
      }

      showToast.success('Document deleted successfully')
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
    } catch (error) {
      console.error('Error deleting document:', error)
      showToast.error('Failed to delete document', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner portal="driver" label="Loading documents..." />
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[100px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Documents
        </h1>
        <p className="text-slate-400">View all documents from your assigned loads</p>
      </div>

      {/* Filters */}
      <div className="glass-primary p-6 rounded-xl mb-6 border border-slate-700/50 shadow-lg">
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

      {/* Documents List */}
      {filteredAndSortedDocuments.length === 0 ? (
        <EmptyState
          portal="driver"
          title={searchQuery || filter !== 'all' ? 'No documents match your filters' : 'No documents found'}
          description={searchQuery || filter !== 'all' ? 'Try adjusting your search or filters' : 'Documents uploaded for your loads will appear here'}
          icon={
            <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-slate-300 mb-2">
            Showing {filteredAndSortedDocuments.length} of {documents.length} documents
          </div>
          {filteredAndSortedDocuments.map((doc) => (
            <div key={doc.id} className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-white text-lg">{doc.title}</h3>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {getDocumentTypeLabel(doc.type)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-300">
                      Load: <Link href={`/driver/loads/${doc.loadRequest.id}`} className="font-mono text-cyan-400 hover:text-cyan-300 underline">{doc.loadTrackingCode}</Link>
                    </p>
                    <p className="text-xs text-slate-400">
                      Uploaded: {formatDate(doc.createdAt)}
                      {doc.uploadedBy && ` by ${doc.uploadedBy}`}
                    </p>
                    {doc.fileSize && (
                      <p className="text-xs text-slate-400">
                        Size: {(doc.fileSize / 1024).toFixed(2)} KB
                      </p>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <DocumentViewButton 
                    url={doc.url}
                    title={doc.title}
                    type={doc.type}
                    className="px-4 py-2 rounded-lg bg-gradient-accent text-white font-semibold hover:shadow-lg transition-all shadow-medical inline-block"
                  />
                  {!doc.isLocked && (
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.loadRequest.id)}
                      className="p-2 text-urgent-600 hover:bg-urgent-50 rounded-lg transition-colors"
                      title="Delete document"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
