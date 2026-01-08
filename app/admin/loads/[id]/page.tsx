'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { LOAD_STATUS_LABELS, LOAD_STATUS_COLORS, TRACKING_EVENT_LABELS } from '@/lib/constants'
import type { LoadStatus } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import LoadNotes from '@/components/features/LoadNotes'
import { showToast, showApiError } from '@/lib/toast'
import DocumentViewButton from '@/components/features/DocumentViewButton'
import GPSTrackingMap from '@/components/features/GPSTrackingMap'

type LoadData = any // We'll get this from the API

export default function AdminLoadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [load, setLoad] = useState<LoadData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quote form
  const [quoteAmount, setQuoteAmount] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false)

  // Status update form
  const [selectedStatus, setSelectedStatus] = useState<LoadStatus | ''>('')
  const [eventLabel, setEventLabel] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [locationText, setLocationText] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Driver assignment
  const [drivers, setDrivers] = useState<any[]>([])
  const [selectedDriver, setSelectedDriver] = useState('')
  const [isAssigningDriver, setIsAssigningDriver] = useState(false)

  // Invoice generation
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [invoice, setInvoice] = useState<any>(null)

  // Admin user
  const [adminUser, setAdminUser] = useState<any>(null)

  // Document upload
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadType, setUploadType] = useState('PROOF_OF_PICKUP')
  const [isUploading, setIsUploading] = useState(false)

  // GPS Map full-screen
  const [showFullScreenMap, setShowFullScreenMap] = useState(false)

  // Auto-Quote
  const [isAutoQuoting, setIsAutoQuoting] = useState(false)
  const [autoQuotePreview, setAutoQuotePreview] = useState<any>(null)
  const [showAutoQuoteModal, setShowAutoQuoteModal] = useState(false)

  // Auto-Assign Driver
  const [isAutoAssigning, setIsAutoAssigning] = useState(false)
  const [autoAssignPreview, setAutoAssignPreview] = useState<any>(null)
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load data
  useEffect(() => {
    if (params.id) {
      fetchLoad()
      fetchDrivers()
    }
    // Get admin user info
    const adminData = localStorage.getItem('admin')
    if (adminData) {
      setAdminUser(JSON.parse(adminData))
    }
  }, [params.id])

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/drivers')
      if (!response.ok) throw new Error('Failed to fetch drivers')
      const data = await response.json()
      setDrivers(data.drivers)
    } catch (error) {
      console.error('Error fetching drivers:', error)
    }
  }

  const fetchLoad = async () => {
    try {
      const response = await fetch(`/api/load-requests/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch load')
      const data = await response.json()
      setLoad(data)
      setQuoteAmount(data.quoteAmount?.toString() || '')
      setQuoteNotes(data.quoteNotes || '')
      
      // If load has an invoice, fetch it
      if (data.invoiceId) {
        try {
          const invoiceResponse = await fetch(`/api/invoices/${data.invoiceId}`)
          if (invoiceResponse.ok) {
            const invoiceData = await invoiceResponse.json()
            setInvoice(invoiceData.invoice)
          }
        } catch (err) {
          console.error('Error fetching invoice:', err)
        }
      }
      
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setIsLoading(false)
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
      formData.append('uploadedBy', 'admin')

      const response = await fetch(`/api/load-requests/${load.id}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload document')
      }

      showToast.success('Document uploaded successfully!')
      setShowUploadModal(false)
      setUploadFile(null)
      setUploadTitle('')
      setUploadType('PROOF_OF_PICKUP')
      await fetchLoad()
    } catch (error) {
      console.error('Error uploading document:', error)
      showApiError(error, 'Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingQuote(true)

    try {
      const response = await fetch(`/api/load-requests/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'QUOTED',
          quoteAmount: parseFloat(quoteAmount),
          quoteNotes,
          eventCode: 'PRICE_QUOTED',
          eventLabel: `Price quoted: $${quoteAmount}`,
          eventDescription: quoteNotes,
        }),
      })

      if (!response.ok) throw new Error('Failed to update quote')

      await fetchLoad()
      showToast.success('Quote submitted successfully!')
    } catch (err) {
      showApiError(err, 'Failed to submit quote')
    } finally {
      setIsSubmittingQuote(false)
    }
  }

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStatus) return

    setIsUpdatingStatus(true)

    try {
      const response = await fetch(`/api/load-requests/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
          eventLabel: eventLabel || LOAD_STATUS_LABELS[selectedStatus as LoadStatus],
          eventDescription,
          locationText,
        }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      await fetchLoad()
      setSelectedStatus('')
      setEventLabel('')
      setEventDescription('')
      setLocationText('')
      showToast.success('Status updated successfully!')
    } catch (err) {
      showApiError(err, 'Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleGenerateInvoice = async () => {
    if (!load || !load.quoteAmount) {
      showToast.warning('Load must have a quote amount to generate an invoice')
      return
    }

    setIsGeneratingInvoice(true)
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loadRequestIds: [load.id],
          shipperId: load.shipperId,
          subtotal: load.quoteAmount,
          tax: 0, // Can be adjusted later
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate invoice')
      }

      const data = await response.json()
      setInvoice(data.invoice)
      
      // Refresh load data to get invoice ID
      await fetchLoad()
      
      showToast.success(`Invoice ${data.invoice.invoiceNumber} created successfully!`)
    } catch (err) {
      showApiError(err, 'Failed to generate invoice')
      console.error('Error generating invoice:', err)
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  const handleDriverAssignment = async () => {
    if (!selectedDriver) return

    setIsAssigningDriver(true)

    try {
      const response = await fetch(`/api/load-requests/${params.id}/assign-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedDriver }),
      })

      if (!response.ok) throw new Error('Failed to assign driver')

      await fetchLoad()
      showToast.success('Driver assigned successfully!')
    } catch (err) {
      showApiError(err, 'Failed to assign driver')
    } finally {
      setIsAssigningDriver(false)
    }
  }

  const handleAutoQuote = async () => {
    setIsAutoQuoting(true)
    try {
      const response = await fetch(`/api/load-requests/${params.id}/auto-quote`, {
        method: 'GET',
      })

      if (!response.ok) throw new Error('Failed to generate auto-quote')

      const data = await response.json()
      setAutoQuotePreview(data)
      setShowAutoQuoteModal(true)
    } catch (err) {
      showApiError(err, 'Failed to generate auto-quote')
    } finally {
      setIsAutoQuoting(false)
    }
  }

  const handleApplyAutoQuote = async () => {
    if (!autoQuotePreview) return

    setIsAutoQuoting(true)
    try {
      const response = await fetch(`/api/load-requests/${params.id}/auto-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) throw new Error('Failed to apply auto-quote')

      await fetchLoad()
      setShowAutoQuoteModal(false)
      setAutoQuotePreview(null)
      showToast.success('Auto-quote applied successfully!')
    } catch (err) {
      showApiError(err, 'Failed to apply auto-quote')
    } finally {
      setIsAutoQuoting(false)
    }
  }

  const handleAutoAssign = async () => {
    setIsAutoAssigning(true)
    try {
      const response = await fetch(`/api/load-requests/${params.id}/auto-assign-driver`, {
        method: 'GET',
      })

      if (!response.ok) throw new Error('Failed to find auto-assignment')

      const data = await response.json()
      setAutoAssignPreview(data)
      setShowAutoAssignModal(true)
    } catch (err) {
      showApiError(err, 'Failed to find auto-assignment')
    } finally {
      setIsAutoAssigning(false)
    }
  }

  const handleApplyAutoAssign = async () => {
    if (!autoAssignPreview || !autoAssignPreview.recommendedDriver) return

    setIsAutoAssigning(true)
    try {
      const response = await fetch(`/api/load-requests/${params.id}/auto-assign-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assign: true }),
      })

      if (!response.ok) throw new Error('Failed to apply auto-assignment')

      await fetchLoad()
      setShowAutoAssignModal(false)
      setAutoAssignPreview(null)
      showToast.success('Driver auto-assigned successfully!')
    } catch (err) {
      showApiError(err, 'Failed to apply auto-assignment')
    } finally {
      setIsAutoAssigning(false)
    }
  }

  const handleConvertToLoad = async () => {
    if (!confirm('Convert this quote request to a scheduled load? This will change the status to SCHEDULED.')) {
      return
    }

    try {
      const response = await fetch(`/api/load-requests/${params.id}/convert-to-load`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to convert quote to load')

      await fetchLoad()
      showToast.success('Quote converted to load successfully!')
    } catch (err) {
      showApiError(err, 'Failed to convert quote to load')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading load details...</p>
        </div>
      </div>
    )
  }

  if (error || !load) {
    return (
      <div className="p-8">
        <div className="glass-primary p-8 rounded-xl text-center border border-slate-700/50 shadow-lg">
          <p className="text-red-400 mb-4">{error || 'Load not found'}</p>
          <Link href="/admin/loads" className="text-cyan-400 hover:text-cyan-300 font-medium">
            ← Back to Loads
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-0 z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <Link href="/admin/loads" className="text-cyan-400 hover:text-cyan-300 font-medium mb-4 inline-block">
          ← Back to Loads
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight font-data">
              {load.publicTrackingCode}
            </h1>
            <p className="text-slate-400">Manage load request and tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-lg font-semibold ${LOAD_STATUS_COLORS[load.status as LoadStatus] || 'bg-slate-700/50 text-slate-300 border border-slate-600/50'}`}>
              {LOAD_STATUS_LABELS[load.status as LoadStatus] || load.status}
            </span>
            <Link
              href={`/track/${load.publicTrackingCode}`}
              target="_blank"
              className="px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 text-slate-300 font-medium transition-base"
            >
              View Public Page ↗
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content - Left 2/3 */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shipper & Facility Info */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Shipper & Locations</h2>

            {/* Shipper */}
            <div className="mb-6 pb-6 border-b border-slate-700/50">
              <h3 className="font-semibold text-slate-300 mb-3">Shipper Information</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Company</p>
                  <p className="font-semibold text-white">{load.shipper.companyName}</p>
                </div>
                <div>
                  <p className="text-slate-400">Type</p>
                  <p className="font-semibold text-white">{load.shipper.clientType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-slate-400">Contact</p>
                  <p className="font-semibold text-white">{load.shipper.contactName}</p>
                </div>
                <div>
                  <p className="text-slate-400">Phone</p>
                  <p className="font-semibold text-white">{load.shipper.phone}</p>
                </div>
                <div>
                  <p className="text-slate-400">Email</p>
                  <p className="font-semibold text-white">{load.shipper.email}</p>
                </div>
                <div>
                  <p className="text-slate-400">Preferred Contact</p>
                  <p className="font-semibold text-white">{load.preferredContactMethod}</p>
                </div>
              </div>
            </div>

            {/* Pickup */}
            <div className="mb-6 pb-6 border-b border-slate-700/50">
              <h3 className="font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                </svg>
                Pickup Location
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="md:col-span-2">
                  <p className="font-semibold text-white">{load.pickupFacility.name}</p>
                  <p className="text-slate-400">{load.pickupFacility.addressLine1}</p>
                  {load.pickupFacility.addressLine2 && <p className="text-slate-400">{load.pickupFacility.addressLine2}</p>}
                  <p className="text-slate-400">
                    {load.pickupFacility.city}, {load.pickupFacility.state} {load.pickupFacility.postalCode}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Contact</p>
                  <p className="font-semibold text-white">{load.pickupFacility.contactName}</p>
                </div>
                <div>
                  <p className="text-slate-400">Phone</p>
                  <p className="font-semibold text-white">{load.pickupFacility.contactPhone}</p>
                </div>
                {load.readyTime && (
                  <div className="md:col-span-2">
                    <p className="text-slate-400">Ready Time</p>
                    <p className="font-semibold text-white">{formatDateTime(load.readyTime)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dropoff */}
            <div>
              <h3 className="font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
                </svg>
                Delivery Location
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="md:col-span-2">
                  <p className="font-semibold text-white">{load.dropoffFacility.name}</p>
                  <p className="text-slate-400">{load.dropoffFacility.addressLine1}</p>
                  {load.dropoffFacility.addressLine2 && <p className="text-slate-400">{load.dropoffFacility.addressLine2}</p>}
                  <p className="text-slate-400">
                    {load.dropoffFacility.city}, {load.dropoffFacility.state} {load.dropoffFacility.postalCode}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Contact</p>
                  <p className="font-semibold text-white">{load.dropoffFacility.contactName}</p>
                </div>
                <div>
                  <p className="text-slate-400">Phone</p>
                  <p className="font-semibold text-white">{load.dropoffFacility.contactPhone}</p>
                </div>
                {load.deliveryDeadline && (
                  <div className="md:col-span-2">
                    <p className="text-slate-400">Delivery Deadline</p>
                    <p className="font-semibold text-white">{formatDateTime(load.deliveryDeadline)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Load Details */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Shipment Details</h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-slate-400 mb-1">Service Type</p>
                <p className="font-semibold text-white">{load.serviceType.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Specimen Category</p>
                <p className="font-semibold text-white">{load.specimenCategory.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Temperature Requirement</p>
                <p className="font-semibold text-white">{load.temperatureRequirement}</p>
              </div>
              {load.estimatedContainers && (
                <div>
                  <p className="text-slate-400 mb-1">Estimated Containers</p>
                  <p className="font-semibold text-white">{load.estimatedContainers}</p>
                </div>
              )}
              {load.estimatedWeightKg && (
                <div>
                  <p className="text-slate-400 mb-1">Estimated Weight</p>
                  <p className="font-semibold text-white">{(load.estimatedWeightKg / 0.453592).toFixed(1)} lb</p>
                </div>
              )}
              {load.declaredValue && (
                <div>
                  <p className="text-slate-400 mb-1">Declared Value</p>
                  <p className="font-semibold text-white">${load.declaredValue.toFixed(2)}</p>
                </div>
              )}
              <div className="md:col-span-2">
                <p className="text-slate-400 mb-1">Commodity Description</p>
                <p className="font-semibold text-white">{load.commodityDescription}</p>
              </div>
              {load.accessNotes && (
                <div className="md:col-span-2">
                  <p className="text-slate-400 mb-1">Additional Instructions</p>
                  <p className="font-semibold text-white">{load.accessNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tracking Events */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">Tracking Events</h2>
            {load.trackingEvents.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="text-xl font-bold text-white mb-2">No tracking events yet</h3>
                <p className="text-slate-400">Tracking updates will appear here once GPS tracking is enabled</p>
              </div>
            ) : (
              <div className="space-y-4">
                {load.trackingEvents.map((event: any) => (
                  <div key={event.id} className="flex items-start gap-4 p-4 bg-white/40 rounded-xl border border-slate-700/50">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
                      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <p className="font-semibold text-white">{event.label}</p>
                        <span className="text-sm text-slate-500 whitespace-nowrap">{formatDateTime(event.createdAt)}</span>
                      </div>
                      {event.locationText && (
                        <p className="text-sm text-slate-400 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {event.locationText}
                        </p>
                      )}
                      {event.description && <p className="text-sm text-slate-400 mt-1">{event.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Right 1/3 */}
        <div className="space-y-8">
          {/* Driver Assignment */}
          <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">Driver Assignment</h3>
            {load.driver ? (
              <div className="mb-4 p-4 bg-green-500/20 rounded-xl border border-green-500/30">
                <p className="text-sm text-slate-400 mb-1">Assigned Driver</p>
                <p className="font-bold text-white">{load.driver.firstName} {load.driver.lastName}</p>
                <p className="text-sm text-slate-400">{load.driver.vehicleType} • {load.driver.vehiclePlate}</p>
                <p className="text-sm text-slate-400">{load.driver.phone}</p>
                {load.assignedAt && (
                  <p className="text-xs text-slate-500 mt-2">Assigned: {formatDateTime(load.assignedAt)}</p>
                )}
              </div>
            ) : (
              <div className="mb-4 p-4 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                <p className="text-sm text-yellow-400 font-medium">No driver assigned</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  {load.driver ? 'Reassign to Driver' : 'Assign Driver'}
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                >
                  <option value="">Select driver...</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.firstName} {driver.lastName} - {driver.vehicleType} ({driver.status})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleDriverAssignment}
                disabled={isAssigningDriver || !selectedDriver}
                className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-base"
              >
                {isAssigningDriver ? 'Assigning...' : load.driver ? 'Reassign Driver' : 'Assign Driver'}
              </button>
            </div>
          </div>

          {/* Quote Management */}
          <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Quote & Pricing</h3>
              {load.status === 'NEW' || load.status === 'QUOTE_REQUESTED' ? (
                <button
                  onClick={handleAutoQuote}
                  disabled={isAutoQuoting}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-yellow-500/50 transition-all disabled:opacity-50 shadow-lg shadow-yellow-500/30 text-sm"
                >
                  {isAutoQuoting ? 'Calculating...' : 'Auto-Quote'}
                </button>
              ) : null}
            </div>
            <form onSubmit={handleQuoteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Quote Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Quote Notes</label>
                <textarea
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                  placeholder="Internal notes about pricing..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmittingQuote || !quoteAmount}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/30"
                >
                  {isSubmittingQuote ? 'Submitting...' : 'Submit Quote'}
                </button>
                {load.status === 'QUOTE_REQUESTED' && (
                  <button
                    type="button"
                    onClick={handleConvertToLoad}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-green-500/50 transition-all shadow-lg shadow-green-500/30"
                  >
                    Convert to Load
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Invoice Generation */}
          {load.status === 'DELIVERED' && (
            <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-4">Invoice</h3>
              {load.invoiceId ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/20 rounded-xl border border-green-500/30">
                    <p className="text-sm text-green-400 font-medium mb-2">
                      This load has been invoiced
                    </p>
                    {invoice && (
                      <div className="space-y-1 text-sm text-slate-300">
                        <p>Invoice #: <span className="font-mono font-bold font-data">{invoice.invoiceNumber}</span></p>
                        <p>Amount: <span className="font-bold font-data">${invoice.total.toFixed(2)}</span></p>
                        <p>Status: <span className="font-semibold">{invoice.status}</span></p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/api/invoices/${load.invoiceId}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all text-center shadow-lg shadow-cyan-500/30"
                    >
                      View Invoice PDF
                    </a>
                    <a
                      href="/admin/invoices"
                      className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 font-semibold hover:bg-slate-700/70 border border-slate-600/50 transition-colors"
                    >
                      Manage Invoices
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!load.quoteAmount ? (
                    <div className="p-4 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                      <p className="text-sm text-yellow-400">
                        Please set a quote amount before generating an invoice
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-blue-500/20 rounded-xl border border-blue-500/30">
                        <p className="text-sm text-blue-800 font-medium mb-2">
                          Ready to generate invoice
                        </p>
                        <p className="text-sm text-slate-300">
                          Amount: <span className="font-bold">${load.quoteAmount.toFixed(2)}</span>
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateInvoice}
                        disabled={isGeneratingInvoice || !load.quoteAmount}
                        className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isGeneratingInvoice ? 'Generating Invoice...' : 'Generate Invoice'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status Update */}
          <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">Update Status</h3>
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">New Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as LoadStatus)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                  required
                >
                  <option value="">Select status...</option>
                  <option value="QUOTE_ACCEPTED">Quote Accepted</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PICKED_UP">Picked Up</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Event Label</label>
                <input
                  type="text"
                  value={eventLabel}
                  onChange={(e) => setEventLabel(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Location</label>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                  placeholder="City, State"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Description</label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                  placeholder="Additional details..."
                />
              </div>
              <button
                type="submit"
                disabled={isUpdatingStatus || !selectedStatus}
                className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-accent-600 to-accent-700 text-white font-semibold hover:from-accent-700 hover:to-accent-800 disabled:opacity-50 disabled:cursor-not-allowed transition-base"
              >
                {isUpdatingStatus ? 'Updating...' : 'Update Status'}
              </button>
            </form>
          </div>

          {/* Notes */}
          <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">Notes</h3>
            <LoadNotes
              loadRequestId={load.id}
              currentUserId={adminUser?.id || 'admin'}
              currentUserType="ADMIN"
              canEdit={true}
            />
          </div>

          {/* Documents */}
          <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">Documents</h3>
            {load.documents.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-bold text-white mb-2">No documents yet</h3>
                <p className="text-slate-400">Documents will appear here once uploaded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {load.documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-white/40 rounded-lg hover:bg-white/60 border border-slate-700/50 transition-base"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{doc.title}</p>
                      <p className="text-xs text-slate-500">{doc.type.replace(/_/g, ' ')}</p>
                    </div>
                    <DocumentViewButton 
                      url={doc.url}
                      title={doc.title}
                      type={doc.type}
                      className="ml-3 px-3 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 w-full px-4 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 transition-base"
            >
              Upload Document
            </button>
          </div>

          {/* GPS Tracking Map */}
          <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">GPS Tracking</h3>
              {load.gpsTrackingEnabled && (
                <button
                  onClick={() => setShowFullScreenMap(true)}
                  className="px-3 py-1 text-sm rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-medium transition-colors"
                >
                  Full Screen
                </button>
              )}
            </div>
            <GPSTrackingMap
              loadId={load.id}
              pickupAddress={`${load.pickupFacility.addressLine1}, ${load.pickupFacility.city}, ${load.pickupFacility.state}`}
              dropoffAddress={`${load.dropoffFacility.addressLine1}, ${load.dropoffFacility.city}, ${load.dropoffFacility.state}`}
              enabled={load.gpsTrackingEnabled || false}
            />
          </div>
        </div>
      </div>

      {/* Full-Screen GPS Map Modal */}
      {showFullScreenMap && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="w-full h-full max-w-7xl">
            <GPSTrackingMap
              loadId={load.id}
              pickupAddress={`${load.pickupFacility.addressLine1}, ${load.pickupFacility.city}, ${load.pickupFacility.state}`}
              dropoffAddress={`${load.dropoffFacility.addressLine1}, ${load.dropoffFacility.city}, ${load.dropoffFacility.state}`}
              enabled={load.gpsTrackingEnabled || false}
              fullScreen={true}
              onCloseFullScreen={() => setShowFullScreenMap(false)}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Auto-Quote Preview Modal */}
      {showAutoQuoteModal && autoQuotePreview && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setShowAutoQuoteModal(false)}
        >
          <div className="glass-primary rounded-xl p-8 max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4 font-heading">Auto-Quote Preview</h2>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-slate-400 mb-1">Suggested Quote Amount</p>
                <p className="text-2xl font-bold text-white font-data">${autoQuotePreview.suggestedAmount?.toFixed(2) || '0.00'}</p>
              </div>
              {autoQuotePreview.factors && (
                <div>
                  <p className="text-sm text-slate-400 mb-2">Pricing Factors:</p>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {Object.entries(autoQuotePreview.factors).map(([key, value]: [string, any]) => (
                      <li key={key} className="flex justify-between">
                        <span>{key.replace(/_/g, ' ')}:</span>
                        <span className="font-semibold">{typeof value === 'number' ? `$${value.toFixed(2)}` : String(value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowAutoQuoteModal(false)
                  setAutoQuotePreview(null)
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 transition-colors border border-slate-600/50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAutoQuote}
                disabled={isAutoQuoting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-yellow-500/50 transition-all disabled:opacity-50 shadow-lg shadow-yellow-500/30"
              >
                {isAutoQuoting ? 'Applying...' : 'Apply Quote'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Auto-Assign Preview Modal */}
      {showAutoAssignModal && autoAssignPreview ? (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAutoAssignModal(false)}>
          <div className="glass-primary rounded-xl p-8 max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4 font-heading">Auto-Assign Driver</h2>
            {autoAssignPreview.recommendedDriver ? (
              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Recommended Driver</p>
                  <p className="text-xl font-bold text-white">
                    {autoAssignPreview.recommendedDriver.firstName} {autoAssignPreview.recommendedDriver.lastName}
                  </p>
                  <p className="text-sm text-slate-300">{autoAssignPreview.recommendedDriver.vehicleType}</p>
                </div>
                {autoAssignPreview.reason && (
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Reason</p>
                    <p className="text-sm text-slate-300">{autoAssignPreview.reason}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-slate-400">No suitable driver found for this load.</p>
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowAutoAssignModal(false)
                  setAutoAssignPreview(null)
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 transition-colors border border-slate-600/50"
              >
                Cancel
              </button>
              {autoAssignPreview.recommendedDriver && (
                <button
                  onClick={handleApplyAutoAssign}
                  disabled={isAutoAssigning}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-purple-500/50 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/30"
                >
                  {isAutoAssigning ? 'Assigning...' : 'Assign Driver'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
