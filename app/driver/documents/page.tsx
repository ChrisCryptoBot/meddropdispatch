'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DriverDocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    // Fetch documents for all loads assigned to this driver
    fetchDocuments()
  }, [router])

  const fetchDocuments = async () => {
    try {
      // This would need an API endpoint to get all documents for a driver
      // For now, showing placeholder
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching documents:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Documents</h1>

      {isLoading ? (
        <div className="glass p-12 rounded-2xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium text-gray-700 mb-2">No documents yet</p>
          <p className="text-sm text-gray-500">Documents uploaded for your loads will appear here</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="glass p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{doc.title}</h3>
                  <p className="text-sm text-gray-600">{doc.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-colors"
                >
                  View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

