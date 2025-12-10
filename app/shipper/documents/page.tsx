'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DocumentsPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
      // Get all loads for this shipper
      const loadsResponse = await fetch(`/api/shippers/${shipperId}/loads`)
      if (!loadsResponse.ok) throw new Error('Failed to fetch loads')
      const loadsData = await loadsResponse.json()
      const loads = loadsData.loads || []

      // Fetch documents for each load
      const allDocuments = []
      for (const load of loads) {
        try {
          const docsResponse = await fetch(`/api/load-requests/${load.id}/documents`)
          if (docsResponse.ok) {
            const docsData = await docsResponse.json()
            const loadDocs = (docsData.documents || []).map((doc: any) => ({
              ...doc,
              loadRequest: {
                id: load.id,
                publicTrackingCode: load.publicTrackingCode || load.trackingCode,
              }
            }))
            allDocuments.push(...loadDocs)
          }
        } catch (error) {
          console.error(`Error fetching documents for load ${load.id}:`, error)
        }
      }

      setDocuments(allDocuments)
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Documents & Invoices</h1>
        <p className="text-gray-600">View and download Bill of Lading, invoices, and proof of delivery</p>
      </div>

      {documents.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-600">
            Documents uploaded by drivers or yourself will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="glass rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{doc.title}</h3>
                    <p className="text-sm text-gray-600">
                      Load: <span className="font-mono">{doc.loadRequest?.publicTrackingCode}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {doc.type.replace(/_/g, ' ')} • {new Date(doc.createdAt).toLocaleDateString()}
                      {doc.uploadedBy && ` • Uploaded by ${doc.uploadedBy}`}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex-shrink-0 ml-4"
                >
                  View/Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

