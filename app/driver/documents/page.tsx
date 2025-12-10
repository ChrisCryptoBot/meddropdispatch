'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface Document {
  id: string
  title: string
  type: string
  url: string
  mimeType: string | null
  fileSize: number | null
  uploadedBy: string | null
  createdAt: string
  loadTrackingCode: string
  loadRequest: {
    id: string
    publicTrackingCode: string
    status: string
  }
}

export default function DriverDocumentsPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsedDriver = JSON.parse(driverData)
    setDriver(parsedDriver)
    fetchDocuments(parsedDriver.id)
  }, [router])

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

  const filteredDocuments = documents.filter((doc) => {
    // Filter by type
    if (filter !== 'all' && doc.type !== filter) return false

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.loadTrackingCode.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query)
      )
    }

    return true
  })

  const getDocumentTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading documents...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Documents</h1>
        <p className="text-gray-600">View all documents from your assigned loads</p>
      </div>

      {/* Filters */}
      <div className="glass p-4 rounded-xl mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by title, tracking code, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Filter by Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            >
              <option value="all">All Types</option>
              <option value="PROOF_OF_PICKUP">Proof of Pickup</option>
              <option value="PROOF_OF_DELIVERY">Proof of Delivery</option>
              <option value="BILL_OF_LADING">Bill of Lading</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
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
          <h3 className="text-xl font-bold text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600">
            {searchQuery || filter !== 'all'
              ? 'No documents match your filters'
              : 'Documents uploaded for your loads will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="glass rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">{doc.title}</h3>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {getDocumentTypeLabel(doc.type)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Load: <Link href={`/driver/loads/${doc.loadRequest.id}`} className="font-mono text-slate-600 hover:text-slate-700 underline">{doc.loadTrackingCode}</Link>
                    </p>
                    <p className="text-xs text-gray-500">
                      Uploaded: {formatDate(doc.createdAt)}
                      {doc.uploadedBy && ` by ${doc.uploadedBy}`}
                    </p>
                    {doc.fileSize && (
                      <p className="text-xs text-gray-500">
                        Size: {(doc.fileSize / 1024).toFixed(2)} KB
                      </p>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold hover:from-slate-700 hover:to-slate-800 transition-all inline-block"
                  >
                    View
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
