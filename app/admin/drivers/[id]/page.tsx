'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getAdminFromStorage } from '@/lib/auth-admin'

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
}

interface Driver {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  status: string
  licenseNumber: string | null
  licenseExpiry: Date | null
  vehicleType: string | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vehiclePlate: string | null
  hasRefrigeration: boolean
  un3373Certified: boolean
  un3373ExpiryDate: Date | null
  hipaaTrainingDate: Date | null
  createdAt: Date
  documents: DriverDocument[]
}

export default function AdminDriverReviewPage() {
  const router = useRouter()
  const params = useParams()
  const driverId = params.id as string

  const [driver, setDriver] = useState<Driver | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [admin, setAdmin] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    const adminData = getAdminFromStorage()
    if (!adminData) {
      router.push('/admin/login')
      return
    }
    setAdmin(adminData)
    fetchDriver(adminData)
  }, [driverId, router])

  const fetchDriver = async (adminData: any) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/drivers/${driverId}/review`, {
        headers: {
          'x-admin-id': adminData.id,
          'x-admin-role': adminData.role,
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to fetch driver details')
      }

      const data = await response.json()
      setDriver(data.driver)
    } catch (err) {
      console.error('Error fetching driver:', err)
      setError(err instanceof Error ? err.message : 'Failed to load driver details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!admin || !driver) return

    if (!confirm(`Are you sure you want to approve ${driver.firstName} ${driver.lastName}?`)) {
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/drivers/${driverId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': admin.id,
          'x-admin-role': admin.role,
        },
        body: JSON.stringify({
          action: 'APPROVE',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to approve driver')
      }

      // Redirect back to pending list
      router.push('/admin/drivers/pending')
    } catch (err) {
      console.error('Error approving driver:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve driver')
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!admin || !driver) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/drivers/${driverId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': admin.id,
          'x-admin-role': admin.role,
        },
        body: JSON.stringify({
          action: 'REJECT',
          rejectionReason: rejectionReason || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to reject driver')
      }

      // Redirect back to pending list
      router.push('/admin/drivers/pending')
    } catch (err) {
      console.error('Error rejecting driver:', err)
      setError(err instanceof Error ? err.message : 'Failed to reject driver')
      setIsProcessing(false)
    }
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DRIVERS_LICENSE: "Driver's License",
      VEHICLE_INSURANCE: 'Vehicle Insurance',
      VEHICLE_REGISTRATION: 'Vehicle Registration',
      HIPAA_CERTIFICATE: 'HIPAA Certificate',
      UN3373_CERTIFICATE: 'UN3373 Certificate',
      W9_FORM: 'W9 Form',
      OTHER: 'Other',
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading driver details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="p-8">
        <div className="glass-primary rounded-2xl p-8 border-2 border-blue-200/30 shadow-glass text-center">
          <p className="text-urgent-700 mb-4">{error || 'Driver not found'}</p>
          <Link
            href="/admin/drivers/pending"
            className="inline-block px-4 py-2 bg-gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Back to Pending Drivers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      {/* Title Container */}
      <div className="sticky top-0 z-30 bg-gradient-medical-bg backdrop-blur-sm pt-[73px] pb-4 mb-8 print:mb-4 print:static print:pt-8 print:top-0 border-b border-blue-200/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link
              href="/admin/drivers/pending"
              className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Pending Drivers
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">
              Review Driver: {driver.firstName} {driver.lastName}
            </h1>
            <p className="text-gray-600 print:text-sm">Review application and documents</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-urgent-50 border-2 border-urgent-200 rounded-xl">
          <p className="text-urgent-700 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Left: Driver Information */}
        <div className="space-y-6">
          <div className="glass-primary rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Driver Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Name</label>
                <p className="text-gray-900">{driver.firstName} {driver.lastName}</p>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-700">Email</label>
                <p className="text-gray-900">{driver.email}</p>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-700">Phone</label>
                <p className="text-gray-900">{driver.phone}</p>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-700">License Number</label>
                <p className="text-gray-900">{driver.licenseNumber || 'Not provided'}</p>
                {driver.licenseExpiry && (
                  <p className="text-sm text-gray-500">Expires: {formatDate(driver.licenseExpiry)}</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-700">Applied Date</label>
                <p className="text-gray-900">{formatDate(driver.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="glass-primary rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Vehicle Information</h2>
            
            <div className="space-y-4">
              {driver.vehicleType ? (
                <>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Vehicle Type</label>
                    <p className="text-gray-900">{driver.vehicleType}</p>
                  </div>
                  
                  {driver.vehicleMake && driver.vehicleModel && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Make & Model</label>
                      <p className="text-gray-900">{driver.vehicleMake} {driver.vehicleModel}</p>
                    </div>
                  )}
                  
                  {driver.vehicleYear && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Year</label>
                      <p className="text-gray-900">{driver.vehicleYear}</p>
                    </div>
                  )}
                  
                  {driver.vehiclePlate && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700">License Plate</label>
                      <p className="text-gray-900">{driver.vehiclePlate}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Refrigeration</label>
                    <p className="text-gray-900">{driver.hasRefrigeration ? 'Yes' : 'No'}</p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">Vehicle information not provided</p>
              )}
            </div>
          </div>

          {/* Certifications */}
          {(driver.un3373Certified || driver.hipaaTrainingDate) && (
            <div className="glass-primary rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Certifications</h2>
              
              <div className="space-y-4">
                {driver.un3373Certified && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700">UN3373 Certified</label>
                    <p className="text-gray-900">Yes</p>
                    {driver.un3373ExpiryDate && (
                      <p className="text-sm text-gray-500">Expires: {formatDate(driver.un3373ExpiryDate)}</p>
                    )}
                  </div>
                )}
                
                {driver.hipaaTrainingDate && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700">HIPAA Training</label>
                    <p className="text-gray-900">Completed: {formatDate(driver.hipaaTrainingDate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Documents */}
        <div>
          <div className="glass-primary rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Uploaded Documents</h2>
            
            {driver.documents.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600">No documents uploaded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {driver.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-white/60 rounded-lg border border-blue-200/30"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{getDocumentTypeLabel(doc.type)}</h3>
                        <p className="text-sm text-gray-600">{doc.title}</p>
                        {doc.expiryDate && (
                          <p className="text-xs text-gray-500 mt-1">Expires: {formatDate(doc.expiryDate)}</p>
                        )}
                        {doc.verifiedAt && (
                          <p className="text-xs text-success-700 mt-1">✓ Verified</p>
                        )}
                        {doc.notes && (
                          <p className="text-xs text-urgent-700 mt-1">Note: {doc.notes}</p>
                        )}
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-gradient-medical-bg backdrop-blur-sm pt-4 pb-4 border-t border-blue-200/30 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isProcessing}
            className="px-6 py-3 bg-urgent-600 text-white rounded-xl font-semibold hover:bg-urgent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            Reject Application
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="px-6 py-3 bg-gradient-success text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {isProcessing ? 'Processing...' : 'Approve Driver'}
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-primary p-8 rounded-3xl max-w-md w-full border-2 border-blue-200/30 shadow-glass">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reject Application</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to reject {driver.firstName} {driver.lastName}'s application?
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white/80"
                rows={4}
              />
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-urgent-600 text-white rounded-lg font-semibold hover:bg-urgent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}





