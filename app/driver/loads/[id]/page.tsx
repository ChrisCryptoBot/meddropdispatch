'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { LOAD_STATUS_LABELS, LOAD_STATUS_COLORS } from '@/lib/constants'
import SignatureCapture from '@/components/features/SignatureCapture'
import CameraCapture from '@/components/features/CameraCapture'
import LoadNotes from '@/components/features/LoadNotes'
import { showToast, showApiError } from '@/lib/toast'
import { getCurrentLocation } from '@/lib/gps'
import { storeOffline, isOnline } from '@/lib/offline-storage'
import DocumentViewButton from '@/components/features/DocumentViewButton'
import AddressAutocomplete from '@/components/features/AddressAutocomplete'

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
  pickupSignerName?: string
  deliverySignature?: string
  deliverySignerName?: string
  pickupTemperature?: number
  deliveryTemperature?: number
  quoteAmount?: number
  autoCalculatedDistance?: number
  deadheadDistance?: number
  totalDistance?: number
  ratePerMile?: number
  suggestedRateMin?: number
  suggestedRateMax?: number
  deadheadStartingLocation?: string
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
  const [showSignatureCapture, setShowSignatureCapture] = useState<'pickup' | null>(null)
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [temperature, setTemperature] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadType, setUploadType] = useState('PROOF_OF_PICKUP')
  const [isUploading, setIsUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [driverStartingLocation, setDriverStartingLocation] = useState('')
  const [isCalculatingRate, setIsCalculatingRate] = useState(false)
  const [rateCalculation, setRateCalculation] = useState<any>(null)

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

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/load-requests/${load.id}/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete document')
      }

      showToast.success('Document deleted successfully')
      await fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      showToast.error('Failed to delete document', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleDeleteLoad = async () => {
    if (!confirm('Are you sure you want to delete this load? This will permanently delete the load and all associated documents. This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/load-requests/${load.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete load')
      }

      showToast.success('Load deleted successfully')
      router.push('/driver/dashboard')
    } catch (error) {
      console.error('Error deleting load:', error)
      showToast.error('Failed to delete load', error instanceof Error ? error.message : 'Unknown error')
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
      
      showToast.success('Document uploaded successfully!', 'Shipper has been notified via email.')
    } catch (error) {
      console.error('Error uploading document:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document'
      showToast.error('Upload failed', `${errorMessage}\n\nPlease ensure:\n- File is PDF, JPG, PNG, or HEIC\n- File size is under 10MB\n- All required fields are filled`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!load) return

    setIsUpdating(true)
    try {
      // Build request body, filtering out undefined values
      const requestBody: any = {
        status: newStatus,
        eventLabel: LOAD_STATUS_LABELS[newStatus as keyof typeof LOAD_STATUS_LABELS] || newStatus,
      }

      // Add location text only if applicable
      if (newStatus === 'PICKED_UP') {
        requestBody.locationText = `${load.pickupFacility.city}, ${load.pickupFacility.state}`
      } else if (newStatus === 'DELIVERED') {
        requestBody.locationText = `${load.dropoffFacility.city}, ${load.dropoffFacility.state}`
      }

      const response = await fetch(`/api/load-requests/${load.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Status update error:', errorData)
        throw new Error(errorData.message || errorData.error || 'Failed to update status')
      }

      await fetchLoad()
      showToast.success('Status updated successfully!')
    } catch (error) {
      console.error('Error updating status:', error)
      showApiError(error, 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSignatureSave = async (signatureData: string) => {
    if (!load || !signerName.trim()) {
      showToast.warning('Please enter the name of the person signing')
      return
    }

    setIsUpdating(true)
    try {
      const updateData: any = {
        pickupSignature: signatureData,
        pickupSignerName: signerName,
        pickupSignatureDriverId: driver?.id || null,
      }

      // Add temperature if provided
      if (temperature) {
        updateData.pickupTemperature = parseFloat(temperature)
      }

      // Auto-update status
      if (load.status === 'SCHEDULED') {
        updateData.status = 'PICKED_UP'
        updateData.actualPickupTime = new Date().toISOString()
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
            locationText: `${load.pickupFacility.city}, ${load.pickupFacility.state}`,
            eventDescription: `Signed by ${signerName}`,
          }),
        })
      }

      await fetchLoad()
      setShowSignatureCapture(null)
      setSignerName('')
      setTemperature('')
      showToast.success('Signature saved successfully!')
    } catch (error) {
      showApiError(error, 'Failed to save signature')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleConfirmDelivery = async () => {
    if (!load) return

    if (!recipientName.trim()) {
      showToast.warning('Please enter the name of the person who received the delivery')
      return
    }

    setIsUpdating(true)
    try {
      // Update load with recipient name
      const updateResponse = await fetch(`/api/load-requests/${load.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliverySignerName: recipientName,
          deliverySignatureDriverId: driver?.id || null,
          actualDeliveryTime: new Date().toISOString(),
        }),
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to save recipient name')
      }

      // Update status
      await handleStatusUpdate('DELIVERED')
      setShowDeliveryConfirm(false)
      setRecipientName('')
    } catch (error) {
      showApiError(error, 'Failed to confirm delivery')
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

  // Delivery confirmation available when in transit
  const canDeliver = ['PICKED_UP', 'IN_TRANSIT'].includes(load.status) && load.status !== 'DELIVERED'

  const handleCalculateRateWithDeadhead = async () => {
    if (!driverStartingLocation.trim()) {
      showToast.error('Please enter your current location')
      return
    }

    setIsCalculatingRate(true)
    try {
      const response = await fetch(`/api/load-requests/${load.id}/calculate-rate-with-deadhead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverStartingLocation }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to calculate rate')
      }

      const data = await response.json()
      setRateCalculation(data.calculation)
      await fetchLoad() // Refresh load data
      showToast.success('Rate calculated successfully!')
    } catch (error) {
      showApiError(error, 'Failed to calculate rate')
    } finally {
      setIsCalculatingRate(false)
    }
  }

  const handleUseCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation()
      if (location) {
        // Try to reverse geocode to get address
        try {
          const response = await fetch(`/api/geocoding/reverse?lat=${location.latitude}&lng=${location.longitude}`)
          if (response.ok) {
            const data = await response.json()
            if (data.address) {
              setDriverStartingLocation(data.address)
              showToast.success('Current location captured')
              return
            }
          }
        } catch (e) {
          // Fall through to coordinates
        }
        // Fallback to coordinates if reverse geocoding fails
        setDriverStartingLocation(`${location.latitude}, ${location.longitude}`)
        showToast.success('Current location captured (coordinates)')
      }
    } catch (error) {
      showToast.error('Could not get current location. Please enter manually.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 pb-20">
      {/* Fixed Load Header - positioned below main app header and sidebar */}
      <header className="glass fixed top-[73px] left-0 md:left-64 right-0 z-40 border-b border-white/30 shadow-sm">
        <div className="px-4 py-4">
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
              {LOAD_STATUS_LABELS[load.status as keyof typeof LOAD_STATUS_COLORS]}
            </span>
          </div>
        </div>
      </header>

      {/* Main content with top padding to account for fixed headers */}
      <main className="px-4 pt-24 md:pt-24 pb-6 space-y-6">
        {/* Rate & Distance Calculation */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Rate & Distance Calculation</h2>
          
          {/* Driver Starting Location Input */}
          <div className="mb-4">
            <label htmlFor="driverStartingLocation" className="block text-sm font-semibold text-gray-700 mb-2">
              Your Current Location (Deadhead Starting Point) *
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <AddressAutocomplete
                  id="driverStartingLocation"
                  value={driverStartingLocation}
                  onChange={setDriverStartingLocation}
                  placeholder="Enter address or use current location"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>
              <button
                onClick={handleUseCurrentLocation}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                title="Use GPS location"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Use GPS
              </button>
              <button
                onClick={handleCalculateRateWithDeadhead}
                disabled={isCalculatingRate || !driverStartingLocation.trim()}
                className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCalculatingRate ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Calculate Rate
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enter your current location to calculate deadhead miles and total rate
            </p>
          </div>

          {/* Rate Display */}
          {(rateCalculation || load.totalDistance) && (
            <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
              <h3 className="font-semibold text-gray-900 mb-3">Rate Calculation</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Deadhead Distance</p>
                  <p className="text-lg font-bold text-gray-900">
                    {rateCalculation?.deadheadDistance?.toFixed(1) || load.deadheadDistance?.toFixed(1) || '0.0'} miles
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Your location → Pickup</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Load Distance</p>
                  <p className="text-lg font-bold text-gray-900">
                    {rateCalculation?.loadDistance?.toFixed(1) || load.autoCalculatedDistance?.toFixed(1) || '0.0'} miles
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Pickup → Delivery</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Distance</p>
                  <p className="text-lg font-bold text-primary-700">
                    {rateCalculation?.totalDistance?.toFixed(1) || load.totalDistance?.toFixed(1) || '0.0'} miles
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Rate Per Mile</p>
                  <p className="text-lg font-bold text-primary-700">
                    ${rateCalculation?.ratePerMile?.toFixed(2) || load.ratePerMile?.toFixed(2) || '0.00'}/mile
                  </p>
                </div>
              </div>
              {(rateCalculation?.suggestedRateMin || load.suggestedRateMin) && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs text-gray-600 mb-1">Suggested Rate Range</p>
                  <p className="text-2xl font-bold text-primary-700">
                    ${(rateCalculation?.suggestedRateMin || load.suggestedRateMin)?.toFixed(2)} - ${(rateCalculation?.suggestedRateMax || load.suggestedRateMax)?.toFixed(2)}
                  </p>
                  {rateCalculation?.breakdown && (
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <p>Base: ${rateCalculation.breakdown.baseRate.toFixed(2)}</p>
                      <p>Distance: ${rateCalculation.breakdown.distanceRate.toFixed(2)} ({rateCalculation.totalDistance.toFixed(1)} mi × ${(rateCalculation.breakdown.distanceRate / rateCalculation.totalDistance).toFixed(2)}/mi)</p>
                      <p>Service Multiplier: {rateCalculation.breakdown.serviceMultiplier}x</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Delivery confirmation - only for actual delivery POD */}
            {canDeliver && (
              <button
                onClick={() => setShowDeliveryConfirm(true)}
                disabled={isUpdating}
                className="px-4 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-base flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm Delivery
              </button>
            )}
            {/* Simple status update buttons - no signature required */}
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
            {load.status === 'IN_TRANSIT' && (
              <button
                onClick={() => handleStatusUpdate('DELIVERED')}
                disabled={isUpdating}
                className="px-4 py-3 rounded-xl bg-white/60 hover:bg-white/80 border border-gray-300 font-semibold transition-base"
              >
                Mark Delivered
              </button>
            )}
          </div>
          
          {/* Delete Load Button - Only for scheduled, completed, cancelled, or delivered loads */}
          {(load.status === 'SCHEDULED' || load.status === 'CANCELLED' || load.status === 'DELIVERED') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleDeleteLoad}
                className="w-full px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold transition-base flex items-center justify-center gap-2"
                title="Delete this load"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Load
              </button>
            </div>
          )}
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
                  <p className="text-sm text-gray-600 mb-2">Pickup Signature - {load.pickupSignerName}</p>
                  <img src={load.pickupSignature} alt="Pickup signature" className="w-full h-32 object-contain bg-white rounded-lg border border-gray-200" />
                </div>
              )}
              {load.deliverySignature && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Delivery Signature - {load.deliverySignerName}</p>
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
                  <div className="flex items-center gap-2">
                    <DocumentViewButton 
                      url={doc.url}
                      title={doc.title}
                    />
                    {!doc.isLocked && (
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete document"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Camera Capture */}
      {showCamera && (
        <CameraCapture
          onCapture={(file) => {
            setUploadFile(file)
            setShowCamera(false)
          }}
          onCancel={() => setShowCamera(false)}
          label="Take Photo"
        />
      )}

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
                <div className="flex gap-2 mb-2">
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
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                    required={!uploadFile}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Camera
                  </button>
                </div>
                {uploadFile && (
                  <p className="text-sm text-green-600 mb-1">✓ {uploadFile.name} selected</p>
                )}
                <p className="text-xs text-gray-500">Accepted: PDF, JPG, PNG, HEIC. Max file size: 10MB</p>
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

      {/* Signature Capture Modal - Only for Pickup */}
      {showSignatureCapture && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-2xl w-full rounded-3xl p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Pickup Confirmation
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
              signerName={signerName}
            />
          </div>
        </div>
      )}

      {/* Delivery Confirmation Modal */}
      {showDeliveryConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-md w-full rounded-3xl p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Confirm Delivery
            </h3>
            <p className="text-gray-700 mb-4">
              Are you sure you have delivered this load to {load?.dropoffFacility.name}?
            </p>
            
            {/* Recipient Name Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Name of Person Who Received *
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                placeholder="Enter recipient name"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeliveryConfirm(false)
                  setRecipientName('')
                }}
                disabled={isUpdating}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 disabled:opacity-50 transition-base"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelivery}
                disabled={isUpdating}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-base"
              >
                {isUpdating ? 'Confirming...' : 'Yes, Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
