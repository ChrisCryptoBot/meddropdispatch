'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import FileUploader from '@/components/FileUploader'

interface DriverDocument {
  id: string
  type: string
  title: string
  url: string
  mimeType: string | null
  fileSize: number | null
  expiryDate: string | null
  verifiedBy: string | null
  verifiedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export default function DriverPendingApprovalPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [documents, setDocuments] = useState<DriverDocument[]>([])
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

        // If driver is already approved, layout will handle redirect
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  // Fetch documents
  useEffect(() => {
    if (!driver) return

    const fetchDocuments = async () => {
      try {
        const response = await fetch(`/api/driver/documents?driverId=${driver.id}`)
        if (response.ok) {
          const data = await response.json()
          setDocuments(data.documents || [])
        }
      } catch (error) {
        console.error('Error fetching documents:', error)
      }
    }

    fetchDocuments()
  }, [driver])

  // Refresh driver status periodically
  useEffect(() => {
    if (!driver) return

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/drivers/${driver.id}`)
        if (response.ok) {
          const updatedDriver = await response.json()
          if (updatedDriver.status !== 'PENDING_APPROVAL') {
            // Status changed, update localStorage and redirect
            localStorage.setItem('driver', JSON.stringify(updatedDriver))
            router.push('/driver/dashboard')
          }
        }
      } catch (error) {
        console.error('Error checking driver status:', error)
      }
    }

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [driver, router])

  const handleDocumentUpload = async (type: string, url: string, file: File) => {
    if (!driver) return

    setUploadingDoc(type)
    setError(null)

    try {
      const response = await fetch('/api/driver/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          type,
          title: `${type === 'DRIVERS_LICENSE' ? "Driver's License" : type === 'VEHICLE_INSURANCE' ? 'Vehicle Insurance' : type}`,
          url,
          mimeType: file.type,
          fileSize: file.size,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save document')
      }

      const data = await response.json()
      
      // Refresh documents list
      const docsResponse = await fetch(`/api/driver/documents?driverId=${driver.id}`)
      if (docsResponse.ok) {
        const docsData = await docsResponse.json()
        setDocuments(docsData.documents || [])
      }
    } catch (err) {
      console.error('Error saving document:', err)
      setError(err instanceof Error ? err.message : 'Failed to save document')
    } finally {
      setUploadingDoc(null)
    }
  }

  const getDocumentStatus = (type: string) => {
    const doc = documents.find(d => d.type === type)
    if (!doc) return 'missing'
    if (doc.verifiedAt) return 'approved'
    if (doc.notes && doc.notes.toLowerCase().includes('reject')) return 'rejected'
    return 'pending'
  }

  const requiredDocuments = [
    { type: 'DRIVERS_LICENSE', label: "Driver's License", required: true },
    { type: 'VEHICLE_INSURANCE', label: 'Vehicle Insurance', required: true },
    { type: 'HIPAA_CERTIFICATE', label: 'HIPAA Certificate', required: false },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-medical-bg flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-medical-bg p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Image
              src="/logo-icon.png"
              alt="MED DROP Logo"
              width={96}
              height={96}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">MED DROP</h1>
          <p className="text-slate-400">Driver Portal</p>
        </div>

        {/* Pending Approval Card */}
        <div className="glass-primary rounded-xl p-10 border border-slate-700/50 shadow-lg">
          <div className="text-center mb-8">
            <svg className="w-16 h-16 text-slate-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-3xl font-bold text-white mb-3 font-heading">Application Under Review</h2>
            <p className="text-lg text-slate-400">
              Thank you for applying to become a MED DROP driver!
            </p>
          </div>

          <div className="bg-cyan-500/20 rounded-xl p-6 mb-8 border border-cyan-500/30">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What Happens Next?
            </h3>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Our team is reviewing your application and documents</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>We'll verify your license, insurance, and vehicle information</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>You'll receive an email notification once your account is approved</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Once approved, you'll have full access to the load board</span>
              </li>
            </ul>
          </div>

          {/* Equipment Checklist Section */}
          <div className="mb-8">
            <h3 className="font-bold text-white mb-4">Equipment Checklist</h3>
            <p className="text-sm text-slate-400 mb-4">
              Please complete the equipment checklist to show what equipment you have available. Some items are required for approval.
            </p>
            <Link
              href="/driver/equipment-checklist"
              className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
            >
              Complete Equipment Checklist
            </Link>
          </div>

          {/* Document Upload Section */}
          <div className="mb-8">
            <h3 className="font-bold text-white mb-4">Required Documents</h3>
            <p className="text-sm text-slate-400 mb-6">
              Please upload the following documents to complete your application. Our team will review them before approving your account.
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {requiredDocuments.map((doc) => {
                const status = getDocumentStatus(doc.type)
                const docData = documents.find(d => d.type === doc.type)
                const isUploading = uploadingDoc === doc.type

                return (
                  <div
                    key={doc.type}
                    className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-white">{doc.label}</h4>
                          {doc.required && (
                            <span className="text-xs text-red-400 font-medium">Required</span>
                          )}
                        </div>
                        
                        {status === 'approved' && (
                          <div className="flex items-center gap-2 text-green-400 text-sm">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Approved</span>
                          </div>
                        )}
                        
                        {status === 'pending' && (
                          <div className="flex items-center gap-2 text-amber-400 text-sm">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            <span>Pending Review</span>
                          </div>
                        )}
                        
                        {status === 'rejected' && docData?.notes && (
                          <div className="mt-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">
                              <strong>Rejected:</strong> {docData.notes}
                            </p>
                            <p className="text-red-300 text-xs mt-1">Please upload a new document.</p>
                          </div>
                        )}
                      </div>

                      {status === 'approved' && (
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                          ✓ Complete
                        </span>
                      )}
                    </div>

                    {(status === 'missing' || status === 'rejected') && !isUploading && (
                      <div className="mt-4">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleDocumentUpload(doc.type, '', file)
                            }
                          }}
                          className="hidden"
                          id={`upload-${doc.type}`}
                        />
                        <label
                          htmlFor={`upload-${doc.type}`}
                          className="inline-block px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 cursor-pointer transition-all shadow-lg shadow-cyan-500/30"
                        >
                          Upload Document
                        </label>
                      </div>
                    )}

                    {isUploading && (
                      <div className="mt-4 flex items-center gap-2 text-amber-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400"></div>
                        <span className="text-sm">Uploading...</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
