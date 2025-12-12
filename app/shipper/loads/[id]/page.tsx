'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { showToast, showApiError } from '@/lib/toast'
import DocumentViewButton from '@/components/features/DocumentViewButton'

interface LoadRequest {
  id: string
  publicTrackingCode: string
  status: string
  readyTime: string | null
  deliveryDeadline: string | null
  quoteAmount: number | null
  quoteNotes: string | null
  // Driver quote fields
  driverQuoteAmount: number | null
  driverQuoteNotes: string | null
  driverQuoteSubmittedAt: string | null
  driverQuoteExpiresAt: string | null
  shipperQuoteDecision: string | null
  // Driver denial fields
  driverDenialReason: string | null
  driverDenialNotes: string | null
  driverDeniedAt: string | null
  lastDeniedByDriverId: string | null
  pickupFacility: {
    name: string
    addressLine1: string
    city: string
    state: string
    postalCode: string
    contactName: string
    contactPhone: string
  }
  dropoffFacility: {
    name: string
    addressLine1: string
    city: string
    state: string
    postalCode: string
    contactName: string
    contactPhone: string
  }
  driver: {
    id: string
    firstName: string
    lastName: string
    phone: string
    vehicleType: string
  } | null
  trackingEvents: Array<{
    id: string
    code: string
    label: string
    description: string | null
    locationText: string | null
    createdAt: string
  }>
  createdAt: string
}

export default function ShipperLoadDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [shipper, setShipper] = useState<any>(null)
  const [load, setLoad] = useState<LoadRequest | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadType, setUploadType] = useState('OTHER')
  const [isUploading, setIsUploading] = useState(false)
  const [showRejectQuoteModal, setShowRejectQuoteModal] = useState(false)
  const [rejectQuoteNotes, setRejectQuoteNotes] = useState('')
  const [isApprovingQuote, setIsApprovingQuote] = useState(false)
  const [isRejectingQuote, setIsRejectingQuote] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('CLIENT_CANCELLED')
  const [cancelBillingRule, setCancelBillingRule] = useState('NOT_BILLABLE')
  const [cancelNotes, setCancelNotes] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    // Check authentication
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    const parsedShipper = JSON.parse(shipperData)
    setShipper(parsedShipper)

    // Fetch load details
    if (params?.id) {
      fetchLoad()
      fetchDocuments()
    }
  }, [router, params])

  const fetchLoad = async () => {
    if (!params?.id) return
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
    if (!params?.id) return
    try {
      const response = await fetch(`/api/load-requests/${params.id}/documents`)
      if (!response.ok) throw new Error('Failed to fetch documents')
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !uploadTitle || !load) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('type', uploadType)
      formData.append('title', uploadTitle)
      formData.append('uploadedBy', 'shipper')

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
      setUploadType('OTHER')
      
      showToast.success('Document uploaded successfully!')
    } catch (error) {
      console.error('Error uploading document:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document'
      showToast.error('Upload failed', `${errorMessage}\n\nPlease ensure:\n- File is PDF, JPG, PNG, or HEIC\n- File size is under 10MB\n- All required fields are filled`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleAcceptQuote = async () => {
    // Handle admin quote acceptance (old flow)
    if (load?.status === 'QUOTED' && load?.quoteAmount) {
      if (!confirm('Accept this quote? This will schedule the shipment.')) return
      if (!params?.id) return
      setIsAccepting(true)
      try {
        const response = await fetch(`/api/load-requests/${params.id}/accept-quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) throw new Error('Failed to accept quote')
        await fetchLoad()
        showToast.success('Quote accepted successfully!', 'Your shipment is now scheduled.')
      } catch (error) {
        console.error('Error accepting quote:', error)
        showToast.error('Failed to accept quote. Please try again.')
      } finally {
        setIsAccepting(false)
      }
      return
    }

    // Handle driver quote approval (new flow)
    if (load?.status === 'DRIVER_QUOTE_SUBMITTED' && load?.driverQuoteAmount && shipper) {
      if (!confirm(`Approve driver quote of $${load.driverQuoteAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}? This will schedule the shipment.`)) return
      if (!params?.id) return
      setIsApprovingQuote(true)
      try {
        const response = await fetch(`/api/load-requests/${params.id}/approve-driver-quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipperId: shipper.id }),
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to approve quote')
        }
        await fetchLoad()
        showToast.success('Driver quote approved!', 'Your shipment is now scheduled.')
      } catch (error) {
        console.error('Error approving quote:', error)
        showApiError(error, 'Failed to approve quote. Please try again.')
      } finally {
        setIsApprovingQuote(false)
      }
    }
  }

  const handleRejectDriverQuote = async () => {
    if (!shipper || !params?.id) return
    
    setIsRejectingQuote(true)
    try {
      const response = await fetch(`/api/load-requests/${params.id}/reject-driver-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipperId: shipper.id,
          rejectionNotes: rejectQuoteNotes || null,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject quote')
      }
      
      await fetchLoad()
      setShowRejectQuoteModal(false)
      setRejectQuoteNotes('')
      showToast.success('Quote rejected', 'Load is now available for other drivers.')
    } catch (error) {
      console.error('Error rejecting quote:', error)
      showApiError(error, 'Failed to reject quote. Please try again.')
    } finally {
      setIsRejectingQuote(false)
    }
  }

  const handleCancelLoad = async () => {
    if (!shipper || !params?.id) return
    
    setIsCancelling(true)
    try {
      const response = await fetch(`/api/load-requests/${params.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellationReason: cancelReason,
          cancelledBy: 'SHIPPER',
          cancelledById: shipper.id,
          cancellationBillingRule: cancelBillingRule,
          notes: cancelNotes || null,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel load')
      }
      
      await fetchLoad()
      setShowCancelModal(false)
      setCancelReason('CLIENT_CANCELLED')
      setCancelBillingRule('NOT_BILLABLE')
      setCancelNotes('')
      showToast.success('Load cancelled successfully.')
      router.push('/shipper/dashboard')
    } catch (error) {
      console.error('Error cancelling load:', error)
      showApiError(error, 'Failed to cancel load. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  // Check if load can be cancelled
  const canCancel = load && !['DELIVERED', 'CANCELLED', 'DENIED'].includes(load.status)

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'REQUESTED': 'bg-blue-100 text-blue-800 border-blue-200',
      'NEW': 'bg-blue-100 text-blue-800 border-blue-200',
      'QUOTED': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'QUOTE_ACCEPTED': 'bg-green-100 text-green-800 border-green-200',
      'DRIVER_QUOTE_PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'DRIVER_QUOTE_SUBMITTED': 'bg-amber-100 text-amber-800 border-amber-200',
      'QUOTE_NEGOTIATION': 'bg-orange-100 text-orange-800 border-orange-200',
      'SCHEDULED': 'bg-purple-100 text-purple-800 border-purple-200',
      'EN_ROUTE': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'PICKED_UP': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'IN_TRANSIT': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'DELIVERED': 'bg-green-100 text-green-800 border-green-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
      'DENIED': 'bg-red-100 text-red-800 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'REQUESTED': 'Scheduling Request',
      'NEW': 'New Request',
      'QUOTED': 'Quote Pending',
      'QUOTE_ACCEPTED': 'Quote Accepted',
      'DRIVER_QUOTE_PENDING': 'Driver Quote Pending',
      'DRIVER_QUOTE_SUBMITTED': 'Quote Submitted - Awaiting Approval',
      'QUOTE_NEGOTIATION': 'Quote Negotiation',
      'SCHEDULED': 'Scheduled',
      'EN_ROUTE': 'En Route to Pickup',
      'PICKED_UP': 'Picked Up',
      'IN_TRANSIT': 'In Transit',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled',
      'DENIED': 'Not Scheduled',
    }
    return labels[status] || status
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading load details...</p>
        </div>
      </div>
    )
  }

  if (!load) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Load not found</p>
          <Link href="/shipper/dashboard" className="text-blue-600 hover:text-blue-700">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/shipper/dashboard" className="text-slate-600 hover:text-slate-700 text-sm mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{load.publicTrackingCode}</h1>
              <p className="text-sm text-gray-600 mt-1">{load.serviceType?.replace(/_/g, ' ')}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(load.status)}`}>
                {getStatusLabel(load.status)}
              </span>
              {canCancel && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  Cancel Load
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quote Acceptance */}
            {load.status === 'QUOTED' && load.quoteAmount && (
              <div className="glass rounded-2xl p-6 border-2 border-yellow-300 bg-gradient-to-r from-yellow-50/80 to-orange-50/80">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Quote Ready for Review</h3>
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        ${load.quoteAmount.toLocaleString()}
                      </div>
                      {load.quoteNotes && (
                        <p className="text-sm text-gray-700 mt-2">{load.quoteNotes}</p>
                      )}
                    </div>
                    <button
                      onClick={handleAcceptQuote}
                      disabled={isAccepting}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAccepting ? 'Accepting...' : 'Accept Quote & Schedule Shipment'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Driver Quote Submission - Awaiting Approval */}
            {load.status === 'DRIVER_QUOTE_SUBMITTED' && load.driverQuoteAmount && (
              <div className="glass rounded-2xl p-6 border-2 border-amber-300 bg-gradient-to-r from-amber-50/80 to-yellow-50/80">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Driver Quote Received
                      {load.driver && ` from ${load.driver.firstName} ${load.driver.lastName}`}
                    </h3>
                    <div className="mb-4">
                      <div className="text-3xl font-bold text-gray-900 mb-2">
                        ${load.driverQuoteAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {load.driverQuoteNotes && (
                        <p className="text-sm text-gray-700 mb-2 bg-white/60 p-3 rounded-lg">{load.driverQuoteNotes}</p>
                      )}
                      {load.driverQuoteExpiresAt && (
                        <p className="text-xs text-gray-500">
                          Quote expires: {new Date(load.driverQuoteExpiresAt).toLocaleString()}
                        </p>
                      )}
                      {load.driver && (
                        <div className="mt-3 text-sm text-gray-600">
                          <p>Driver: {load.driver.firstName} {load.driver.lastName}</p>
                          <p>Vehicle: {load.driver.vehicleType}</p>
                          {load.driver.phone && <p>Phone: {load.driver.phone}</p>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleAcceptQuote}
                        disabled={isApprovingQuote}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isApprovingQuote ? 'Approving...' : 'Approve Quote'}
                      </button>
                      <button
                        onClick={() => setShowRejectQuoteModal(true)}
                        disabled={isApprovingQuote}
                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50"
                      >
                        Reject Quote
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Driver Quote Pending - Waiting for Quote */}
            {load.status === 'DRIVER_QUOTE_PENDING' && load.driver && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-900 mb-2">Driver Quote Pending</h3>
                    <p className="text-blue-700">
                      Driver {load.driver.firstName} {load.driver.lastName} has accepted your load and is preparing a quote.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Driver Denial Display */}
            {load.driverDenialReason && (
              <div className="glass rounded-2xl p-6 border border-red-200 bg-red-50/80">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-900 mb-2">Load Denied by Driver</h3>
                    <div className="space-y-2">
                      <p className="text-red-700">
                        <strong>Reason:</strong> {load.driverDenialReason.replace(/_/g, ' ')}
                      </p>
                      {load.driverDenialNotes && (
                        <p className="text-sm text-red-600 bg-white/60 p-3 rounded-lg">
                          <strong>Notes:</strong> {load.driverDenialNotes}
                        </p>
                      )}
                      {load.driverDeniedAt && (
                        <p className="text-xs text-red-500">
                          Denied on: {new Date(load.driverDeniedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-red-700 mt-3">
                      This load is now available for other drivers to accept.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quote Accepted Confirmation */}
            {load.status === 'QUOTE_ACCEPTED' && (
              <div className="glass rounded-2xl p-6 border border-green-200 bg-green-50/80">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-900 mb-2">Quote Accepted</h3>
                    <p className="text-green-700">
                      Your shipment is confirmed and will be assigned to a driver shortly.
                    </p>
                    {load.quoteAmount && (
                      <div className="text-2xl font-bold text-green-900 mt-2">
                        ${load.quoteAmount.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Route Information */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Route Information</h3>

              <div className="space-y-6">
                {/* Pickup */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">PICKUP</div>
                    <div className="font-bold text-gray-900 text-lg mb-2">{load.pickupFacility.name}</div>
                    <div className="text-gray-700 space-y-1 text-sm">
                      <p>{load.pickupFacility.addressLine1}</p>
                      <p>{load.pickupFacility.city}, {load.pickupFacility.state} {load.pickupFacility.postalCode}</p>
                      <p className="pt-2">
                        <span className="font-medium">Contact:</span> {load.pickupFacility.contactName}
                      </p>
                      <p>
                        <span className="font-medium">Phone:</span>{' '}
                        <a
                          href={`tel:${load.pickupFacility.contactPhone.replace(/\D/g, '')}`}
                          className="text-slate-600 hover:text-slate-800 hover:underline"
                        >
                          {load.pickupFacility.contactPhone}
                        </a>
                      </p>
                      <p className="pt-2">
                        <span className="font-medium">Date:</span> {load.readyTime ? new Date(load.readyTime).toLocaleString() : 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Route Line */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 flex justify-center">
                    <div className="w-0.5 h-12 bg-gradient-to-b from-green-300 to-blue-300"></div>
                  </div>
                </div>

                {/* Delivery */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">DELIVERY</div>
                    <div className="font-bold text-gray-900 text-lg mb-2">{load.dropoffFacility.name}</div>
                    <div className="text-gray-700 space-y-1 text-sm">
                      <p>{load.dropoffFacility.addressLine1}</p>
                      <p>{load.dropoffFacility.city}, {load.dropoffFacility.state} {load.dropoffFacility.postalCode}</p>
                      <p className="pt-2">
                        <span className="font-medium">Contact:</span> {load.dropoffFacility.contactName}
                      </p>
                      <p>
                        <span className="font-medium">Phone:</span>{' '}
                        <a
                          href={`tel:${load.dropoffFacility.contactPhone.replace(/\D/g, '')}`}
                          className="text-slate-600 hover:text-slate-800 hover:underline"
                        >
                          {load.dropoffFacility.contactPhone}
                        </a>
                      </p>
                      {load.deliveryDeadline && (
                        <p className="pt-2">
                          <span className="font-medium">Deadline:</span> {new Date(load.deliveryDeadline).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Load Details */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Load Details</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Equipment Type</div>
                  <div className="font-medium text-gray-900">Standard Vehicle</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Weight</div>
                  <div className="font-medium text-gray-900">N/A</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Temperature Control</div>
                  <div className="font-medium text-gray-900">
                    Temperature Controlled
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Created</div>
                  <div className="font-medium text-gray-900">
                    {new Date(load.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {load.quoteNotes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Notes</div>
                  <div className="text-gray-700">{load.quoteNotes}</div>
                </div>
              )}
            </div>

            {/* Tracking Timeline */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Tracking Timeline</h3>

              {load.trackingEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tracking events yet</p>
              ) : (
                <div className="space-y-4">
                  {load.trackingEvents.map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          <span className="text-xs font-bold">✓</span>
                        </div>
                        {index < load.trackingEvents.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="font-semibold text-gray-900 mb-1">{event.label}</div>
                        {event.description && (
                          <p className="text-sm text-gray-600 mb-1">{event.description}</p>
                        )}
                        {event.locationText && (
                          <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {event.locationText}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents Section */}
            <div className="glass rounded-2xl p-6">
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
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
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
                      <DocumentViewButton 
                        url={doc.url}
                        title={doc.title}
                        type={doc.type}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> If you received documents via email due to a technical issue, you can upload them here for your records. All documents uploaded by drivers will also appear here automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Driver Information */}
            {load.driver && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Driver Information</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Driver Name</div>
                    <div className="font-medium text-gray-900">
                      {load.driver.firstName} {load.driver.lastName}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Phone</div>
                    <a href={`tel:${load.driver.phone}`} className="font-medium text-blue-600 hover:text-blue-700">
                      {load.driver.phone}
                    </a>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Vehicle</div>
                    <div className="font-medium text-gray-900">{load.driver.vehicleType}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Tracking Code</div>
                  <div className="font-mono font-medium text-gray-900">{load.publicTrackingCode}</div>
                </div>
                {load.quoteAmount && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Quote Amount</div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${load.quoteAmount.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Public Tracking Link */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-sm font-bold text-blue-900 mb-2">Public Tracking</h3>
              <p className="text-xs text-blue-700 mb-3">
                Share this link to allow tracking without login:
              </p>
              <Link
                href={`/track/${load.publicTrackingCode}`}
                target="_blank"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium break-all"
              >
                {typeof window !== 'undefined' && `${window.location.origin}/track/${load.publicTrackingCode}`}
              </Link>
            </div>
          </div>
        </div>
      </div>

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
                        showToast.error('Invalid file type', 'Please upload a PDF or image file (PDF, JPG, PNG, HEIC).')
                        e.target.value = '' // Clear the input
                        setUploadFile(null)
                        return
                      }
                      
                      // Validate file size (10MB)
                      if (file.size > 10 * 1024 * 1024) {
                        showToast.error('File too large', `Maximum size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`)
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
                    setUploadType('OTHER')
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

      {/* Reject Driver Quote Modal */}
      {showRejectQuoteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRejectQuoteModal(false)}>
          <div className="glass max-w-md w-full rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Driver Quote</h3>
            <p className="text-sm text-gray-600 mb-4">
              Rejecting this quote will make the load available for other drivers again.
              {load.driverQuoteAmount && (
                <span className="block mt-2 font-semibold text-gray-900">
                  Quote Amount: ${load.driverQuoteAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rejection Notes (Optional)
                </label>
                <textarea
                  value={rejectQuoteNotes}
                  onChange={(e) => setRejectQuoteNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60"
                  placeholder="Reason for rejecting this quote..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectQuoteModal(false)
                  setRejectQuoteNotes('')
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectDriverQuote}
                disabled={isRejectingQuote}
                className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isRejectingQuote ? 'Rejecting...' : 'Reject Quote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Load Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancel Load</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel this load? This action cannot be undone.
            </p>

            <div className="space-y-4">
              {/* Cancellation Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for Cancellation *
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                >
                  <option value="CLIENT_CANCELLED">Client Cancelled</option>
                  <option value="DRIVER_NO_SHOW">Driver No Show</option>
                  <option value="VEHICLE_BREAKDOWN">Vehicle Breakdown</option>
                  <option value="FACILITY_CLOSED">Facility Closed</option>
                  <option value="WEATHER">Weather</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Billing Rule */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Billing Rule *
                </label>
                <select
                  value={cancelBillingRule}
                  onChange={(e) => setCancelBillingRule(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                >
                  <option value="NOT_BILLABLE">Not Billable</option>
                  <option value="PARTIAL">Partial Charge</option>
                  <option value="BILLABLE">Fully Billable</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Provide any additional details about the cancellation..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason('CLIENT_CANCELLED')
                  setCancelBillingRule('NOT_BILLABLE')
                  setCancelNotes('')
                }}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelLoad}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
