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

    setShipper(JSON.parse(shipperData))
    // TODO: Fetch documents from API
    // For now, show placeholder
    setIsLoading(false)
  }, [router])

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
            Documents related to your shipments will appear here once loads are completed
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="glass rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{doc.name}</h3>
                  <p className="text-sm text-gray-600">{doc.loadRequest?.publicTrackingCode}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

