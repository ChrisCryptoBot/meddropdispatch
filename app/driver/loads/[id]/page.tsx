'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { LOAD_STATUS_LABELS, LOAD_STATUS_COLORS } from '@/lib/constants'
import SignatureCapture from '@/components/features/SignatureCapture'

interface Load {
  id: string
  publicTrackingCode: string
  status: string
  serviceType: string
  commodityDescription: string
  temperatureRequirement: string
  estimatedContainers?: number
  readyTime?: string
  deliveryDeadline?: string
  pickupSignature?: string
  pickupSignatureName?: string
  deliverySignature?: string
  deliverySignatureName?: string
  pickupTemperature?: number
  deliveryTemperature?: number
  pickupFacility: {
    name: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postalCode: string
    contactName: string
    contactPhone: string
  }
  dropoffFacility: {
    name: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postalCode: string
    contactName: string
    contactPhone: string
  }
  shipper: {
    companyName: string
    contactName: string
    phone: string
  }
  trackingEvents: Array<{
    id: string
    label: string
    createdAt: string
    locationText?: string
  }>
}

export default function DriverLoadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [load, setLoad] = useState<Load | null>(null)
  const [driver, setDriver] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSignatureCapture, setShowSignatureCapture] = useState<'pickup' | 'delivery' | null>(null)
  const [signerName, setSignerName] = useState('')
  const [temperature, setTemperature] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadType, setUploadType] = useState('PROOF_OF_PICKUP')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    // Get driver from localStorage
    const driverData = localStorage.getItem('driver')
    if (driverData) {
      try {
        setDriver(JSON.parse(driverData))
      } catch (e) {
        console.error('Error parsing driver data:', e)
      }
    }
  }, [])


  const fetchLoad = async () => {
    try {
      const response = await fetch(`/api/load-requests/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch load')
      const data = await response.json()
      setLoad(data)
    } catch (error) {
      console.error('Error fetching load:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/load-requests/${params.id}/documents`)
      if (!response.ok) throw new Error('Failed to fetch documents')
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchLoad()
      fetchDocuments()
    }
  }, [params.id])

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !uploadTitle || !load) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('type', uploadType)
      formData.append('title', uploadTitle)
      formData.append('uploadedBy', 'driver')

      const response = await fetch(`/api/load-requests/${load.id}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMsg = errorData.error || errorData.message || 'Failed to upload document'
        throw new Error(errorMsg)
      }

      // Refresh documents list
      await fetchDocuments()
      
      // Reset form
      setShowUploadModal(false)
      setUploadFile(null)
      setUploadTitle('')
      setUploadType('PROOF_OF_PICKUP')
      
      alert('Document uploaded successfully! Shipper has been notified via email.')
    } catch (error) {
      console.error('Error uploading document:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document'
      alert(`Upload failed: ${errorMessage}\n\nPlease ensure:\n- File is PDF, JPG, PNG, or HEIC\n- File size is under 10MB\n- All required fields are filled`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!load) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/load-requests/${load.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          eventLabel: LOAD_STATUS_LABELS[newStatus as keyof typeof LOAD_STATUS_LABELS],
          locationText: newStatus === 'PICKED_UP' ? `${load.pickupFacility.city}, ${load.pickupFacility.state}`
                      : newStatus === 'DELIVERED' ? `${load.dropoffFacility.city}, ${load.dropoffFacility.state}`
                      : undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      await fetchLoad()
      alert('Status updated successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSignatureSave = async (signatureData: string) => {
    if (!load || !signerName.trim()) {
      alert('Please enter the name of the person signing')
      return
    }

    setIsUpdating(true)
    try {
      const isPickup = showSignatureCapture === 'pickup'
      const updateData: any = {
        [isPickup ? 'pickupSignature' : 'deliverySignature']: signatureData,
        [isPickup ? 'pickupSignatureName' : 'deliverySignatureName']: signerName,
        [isPickup ? 'pickupSignatureDriverId' : 'deliverySignatureDriverId']: driver?.id || null,
      }

      // Add temperature if provided
      if (temperature) {
        updateData[isPickup ? 'pickupTemperature' : 'deliveryTemperature'] = parseFloat(temperature)
      }

      // Auto-update status
      if (isPickup && load.status === 'SCHEDULED') {
        updateData.status = 'PICKED_UP'
        updateData.actualPickupTime = new Date().toISOString()
      } else if (!isPickup && load.status !== 'DELIVERED') {
        updateData.status = 'DELIVERED'
        updateData.actualDeliveryTime = new Date().toISOString()
      }

      const response = await fetch(`/api/load-requests/${load.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) throw new Error('Failed to save signature')

      // If status changed, create tracking event
      if (updateData.status) {
        await fetch(`/api/load-requests/${load.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: updateData.status,
            eventLabel: LOAD_STATUS_LABELS[updateData.status as keyof typeof LOAD_STATUS_LABELS],
            locationText: isPickup
              ? `${load.pickupFacility.city}, ${load.pickupFacility.state}`
              : `${load.dropoffFacility.city}, ${load.dropoffFacility.state}`,
            eventDescription: `Signed by ${signerName}`,
          }),
        })
      }

      await fetchLoad()
      setShowSignatureCapture(null)
      setSignerName('')
      setTemperature('')
      alert('Signature saved successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save signature')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading load details...</p>
        </div>
      </div>
    )
  }

  if (!load) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass p-8 rounded-2xl text-center">
          <p className="text-red-600 mb-4">Load not found</p>
          <Link href="/driver/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const canPickup = load.status === 'SCHEDULED' && !load.pickupSignature
  const canDeliver = ['PICKED_UP', 'IN_TRANSIT'].includes(load.status) && !load.deliverySignature

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 pb-20">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-white/30">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/driver/dashboard"
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/40 transition-base"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">{load.publicTrackingCode}</h1>
              <p className="text-xs text-gray-600">{load.serviceType.replace(/_/g, ' ')}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${LOAD_STATUS_COLORS[load.status as keyof typeof LOAD_STATUS_COLORS]}`}>
              {LOAD_STATUS_LABELS[load.status as keyof typeof LOAD_STATUS_LABELS]}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {canPickup && (
              <button
                onClick={() => setShowSignatureCapture('pickup')}
                disabled={isUpdating}
                className="px-4 py-4 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition-base flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Confirm Pickup
              </button>
            )}
            {canDeliver && (
              <button
                onClick={() => setShowSignatureCapture('delivery')}
                disabled={isUpdating}
                className="px-4 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-base flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm Delivery
              </button>
            )}
            {load.status === 'SCHEDULED' && (
              <button
                onClick={() => handleStatusUpdate('PICKED_UP')}
                disabled={isUpdating}
                className="px-4 py-3 rounded-xl bg-white/60 hover:bg-white/80 border border-gray-300 font-semibold transition-base"
              >
                Mark Picked Up
              </button>
            )}
            {load.status === 'PICKED_UP' && (
              <button
                onClick={() => handleStatusUpdate('IN_TRANSIT')}
                disabled={isUpdating}
                className="px-4 py-3 rounded-xl bg-white/60 hover:bg-white/80 border border-gray-300 font-semibold transition-base"
              >
                Start Transit
              </button>
            )}
          </div>
        </div>

        {/* Pickup Location */}
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8" />
                </svg>
              </div>
              Pickup Location
            </h3>
            {load.pickupSignature && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                ✓ Signed
              </span>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-gray-900">{load.pickupFacility.name}</p>
            <p className="text-gray-700">{load.pickupFacility.addressLine1}</p>
            {load.pickupFacility.addressLine2 && <p className="text-gray-700">{load.pickupFacility.addressLine2}</p>}
            <p className="text-gray-700">
              {load.pickupFacility.city}, {load.pickupFacility.state} {load.pickupFacility.postalCode}
            </p>
            <div className="pt-2 mt-2 border-t border-gray-200">
              <p className="text-gray-600">Contact: {load.pickupFacility.contactName}</p>
              <p className="text-gray-600">Phone: {load.pickupFacility.contactPhone}</p>
            </div>
            {load.readyTime && (
              <p className="text-gray-600 pt-2 border-t border-gray-200">
                Ready: {formatDateTime(load.readyTime)}
              </p>
            )}
          </div>
        </div>

        {/* Dropoff Location */}
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8" />
                </svg>
              </div>
              Delivery Location
            </h3>
            {load.deliverySignature && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                ✓ Signed
              </span>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-gray-900">{load.dropoffFacility.name}</p>
            <p className="text-gray-700">{load.dropoffFacility.addressLine1}</p>
            {load.dropoffFacility.addressLine2 && <p className="text-gray-700">{load.dropoffFacility.addressLine2}</p>}
            <p className="text-gray-700">
              {load.dropoffFacility.city}, {load.dropoffFacility.state} {load.dropoffFacility.postalCode}
            </p>
            <div className="pt-2 mt-2 border-t border-gray-200">
              <p className="text-gray-600">Contact: {load.dropoffFacility.contactName}</p>
              <p className="text-gray-600">Phone: {load.dropoffFacility.contactPhone}</p>
            </div>
            {load.deliveryDeadline && (
              <p className="text-gray-600 pt-2 border-t border-gray-200">
                Deadline: {formatDateTime(load.deliveryDeadline)}
              </p>
            )}
          </div>
        </div>

        {/* Cargo Details */}
        <div className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Cargo Details</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Description</p>
              <p className="font-semibold text-gray-900">{load.commodityDescription}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 mb-1">Temperature</p>
                <p className="font-semibold text-gray-900">{load.temperatureRequirement}</p>
              </div>
              {load.estimatedContainers && (
                <div>
                  <p className="text-gray-600 mb-1">Containers</p>
                  <p className="font-semibold text-gray-900">{load.estimatedContainers}</p>
                </div>
              )}
            </div>
            {(load.pickupTemperature || load.deliveryTemperature) && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-gray-600 mb-2">Temperature Log</p>
                {load.pickupTemperature && (
                  <p className="text-sm text-gray-700">Pickup: {load.pickupTemperature}°C</p>
                )}
                {load.deliveryTemperature && (
                  <p className="text-sm text-gray-700">Delivery: {load.deliveryTemperature}°C</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Signatures */}
        {(load.pickupSignature || load.deliverySignature) && (
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Signatures</h3>
            <div className="space-y-4">
              {load.pickupSignature && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Pickup Signature - {load.pickupSignatureName}</p>
                  <img src={load.pickupSignature} alt="Pickup signature" className="w-full h-32 object-contain bg-white rounded-lg border border-gray-200" />
                </div>
              )}
              {load.deliverySignature && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Delivery Signature - {load.deliverySignatureName}</p>
                  <img src={load.deliverySignature} alt="Delivery signature" className="w-full h-32 object-contain bg-white rounded-lg border border-gray-200" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents Section */}
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Documents</h3>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 transition-base text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Document
            </button>
          </div>

          {documents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No documents uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{doc.title}</p>
                      <p className="text-xs text-gray-500">
                        {doc.type.replace(/_/g, ' ')} • {new Date(doc.createdAt).toLocaleDateString()}
                        {doc.uploadedBy && ` • Uploaded by ${doc.uploadedBy}`}
                      </p>
                    </div>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Document Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-2xl w-full rounded-3xl p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Upload Document</h3>

            <form onSubmit={handleDocumentUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Document Type *
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                  required
                >
                  <option value="PROOF_OF_PICKUP">Proof of Pickup</option>
                  <option value="PROOF_OF_DELIVERY">Proof of Delivery</option>
                  <option value="BILL_OF_LADING">Bill of Lading</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                  placeholder="e.g., Proof of Delivery - ABC Clinic"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  File (PDF, Image) *
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf,.jpg,.jpeg,.png,image/jpeg,image/png,image/heic"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    if (file) {
                      // Validate file type
                      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic']
                      const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.heic']
                      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
                      
                      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
                        alert(`Invalid file type. Please upload a PDF or image file (PDF, JPG, PNG, HEIC).`)
                        e.target.value = '' // Clear the input
                        setUploadFile(null)
                        return
                      }
                      
                      // Validate file size (10MB)
                      if (file.size > 10 * 1024 * 1024) {
                        alert(`File size is too large. Maximum size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`)
                        e.target.value = ''
                        setUploadFile(null)
                        return
                      }
                    }
                    setUploadFile(file)
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Accepted: PDF, JPG, PNG, HEIC. Max file size: 10MB</p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                    setUploadTitle('')
                    setUploadType('PROOF_OF_PICKUP')
                  }}
                  className="flex-1 px-6 py-3 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile || !uploadTitle}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-base"
                >
                  {isUploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signature Capture Modal */}
      {showSignatureCapture && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-2xl w-full rounded-3xl p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {showSignatureCapture === 'pickup' ? 'Pickup' : 'Delivery'} Confirmation
            </h3>

            {/* Signer Name */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Name of Person Signing *
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Temperature */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Temperature (°C) - Optional
              </label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                placeholder="2.5"
              />
            </div>

            {/* Signature Capture Component */}
            <SignatureCapture
              onSave={handleSignatureSave}
              onCancel={() => {
                setShowSignatureCapture(null)
                setSignerName('')
                setTemperature('')
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
