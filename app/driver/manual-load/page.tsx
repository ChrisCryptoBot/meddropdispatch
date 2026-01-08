'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { showToast } from '@/lib/toast'
import RateCalculator from '@/components/features/RateCalculator'
import AddressAutocomplete from '@/components/features/AddressAutocomplete'
import FacilityAutocomplete from '@/components/features/FacilityAutocomplete'
import ShipperAutocomplete from '@/components/features/ShipperAutocomplete'

function DriverManualLoadPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [driver, setDriver] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadId, setLoadId] = useState<string | null>(null)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadType, setUploadType] = useState('PROOF_OF_PICKUP')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{title: string, type: string}>>([])
  const [callbackId, setCallbackId] = useState<string | null>(null)
  const [selectedShipperId, setSelectedShipperId] = useState<string>('')
  const [selectedShipperData, setSelectedShipperData] = useState<{
    id: string
    companyName: string
    email: string
    contactName: string
    phone: string
    clientType: string
    shipperCode: string | null // Client ID
  } | null>(null)
  const [drivers, setDrivers] = useState<Array<{id: string, firstName: string, lastName: string, email: string, status: string}>>([])
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [newShipperData, setNewShipperData] = useState({
    companyName: '',
    email: '',
    contactName: '',
    phone: '',
    clientType: 'OTHER',
  })
  const [formData, setFormData] = useState<any>({
    pickupFacilityName: '',
    pickupAddressLine1: '',
    pickupCity: '',
    pickupState: '',
    pickupPostalCode: '',
    pickupContactPhone: '',
    dropoffFacilityName: '',
    dropoffAddressLine1: '',
    dropoffCity: '',
    dropoffState: '',
    dropoffPostalCode: '',
    dropoffContactPhone: '',
    serviceType: 'OTHER',
    quotedRate: '', // Final negotiated rate
  })
  const [draftId, setDraftId] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    // Get driver from API auth check (httpOnly cookie) - layout handles redirects
    const fetchDriverData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'driver') {
          return // Layout will handle redirect
        }
        
        setDriver(data.user)
        fetchDrivers()

        // Check for callbackId and shipperId in URL params
        const urlCallbackId = searchParams.get('callbackId')
        const urlShipperId = searchParams.get('shipperId')
        
        if (urlCallbackId) {
          setCallbackId(urlCallbackId)
        }
        
        if (urlShipperId) {
          // Fetch shipper data and pre-fill form
          fetchShipperData(urlShipperId)
        } else {
          // Load most recent draft if no shipperId in URL
          loadMostRecentDraft(data.user.id)
        }
      } catch (error) {
        console.error('Error fetching driver data:', error)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [searchParams])

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!driver) return

    const autoSaveInterval = setInterval(() => {
      saveDraft()
    }, 30000) // 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [driver, formData, newShipperData, selectedShipperId, selectedDriverId, callbackId])

  const loadMostRecentDraft = async (driverId: string) => {
    try {
      const response = await fetch(`/api/load-requests/draft?driverId=${driverId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.drafts && data.drafts.length > 0) {
          const mostRecentDraft = data.drafts[0]
          setDraftId(mostRecentDraft.id)
          
          // Restore form data
          if (mostRecentDraft.data) {
            const draftData = mostRecentDraft.data
            setFormData(draftData.formData || formData)
            setNewShipperData(draftData.newShipperData || newShipperData)
            setSelectedShipperId(draftData.selectedShipperId || '')
            setSelectedDriverId(draftData.selectedDriverId || '')
            setCallbackId(draftData.callbackId || null)
            
            // If shipper was selected, fetch shipper data
            if (draftData.selectedShipperId) {
              fetchShipperData(draftData.selectedShipperId)
            }
            
            showToast.info('Draft loaded', 'Your previous draft has been restored')
          }
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    }
  }

  const saveDraft = async () => {
    if (!driver || isSavingDraft) return

    // Don't save if form is empty
    if (!formData.pickupFacilityName && !formData.dropoffFacilityName) {
      return
    }

    try {
      setIsSavingDraft(true)
      const draftData = {
        formData,
        newShipperData,
        selectedShipperId,
        selectedDriverId,
        callbackId,
      }

      if (draftId) {
        // Update existing draft
        await fetch(`/api/load-requests/draft/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: draftData }),
        })
      } else {
        // Create new draft
        const response = await fetch('/api/load-requests/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: driver.id,
            data: draftData,
          }),
        })
        if (response.ok) {
          const result = await response.json()
          setDraftId(result.draft.id)
        }
      }
      setLastSavedAt(new Date())
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const deleteDraft = async () => {
    if (!draftId) return

    try {
      await fetch(`/api/load-requests/draft/${draftId}`, {
        method: 'DELETE',
      })
      setDraftId(null)
      setLastSavedAt(null)
    } catch (error) {
      console.error('Error deleting draft:', error)
    }
  }

  const fetchShipperData = async (shipperId: string) => {
    try {
      const response = await fetch(`/api/shippers/${shipperId}`)
      if (response.ok) {
        const shipper = await response.json()
        setSelectedShipperId(shipper.id)
        setSelectedShipperData(shipper)
        // Pre-fill new shipper data with existing shipper info
        setNewShipperData({
          companyName: shipper.companyName || '',
          email: shipper.email || '',
          contactName: shipper.contactName || '',
          phone: shipper.phone || '',
          clientType: shipper.clientType || 'OTHER',
        })
      }
    } catch (error) {
      console.error('Error fetching shipper data:', error)
    }
  }

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/drivers')
      if (response.ok) {
        const data = await response.json()
        // Show all drivers (available and on load) - user can choose any driver
        setDrivers(data.drivers || [])
      }
    } catch (error) {
      console.error('Error fetching drivers:', error)
    }
  }


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formDataObj = new FormData(e.currentTarget)
    const formEntries = Object.fromEntries(formDataObj.entries())
    // Merge with state formData to include facility names from autocomplete
    const data = { ...formEntries, ...formData }
    setFormData(data) // Store for rate calculator
    
    // Auto-save draft on form change
    saveDraft()

    // Validate shipper fields
    if (!newShipperData.companyName || !newShipperData.email || !newShipperData.contactName || !newShipperData.phone) {
      setError('Please fill in all required shipper fields (Company Name, Email, Contact Name, Phone)')
      setIsSubmitting(false)
      return
    }

    // Create a load request for shipper acceptance
    // If selectedShipperId exists, use it. Otherwise, API will create new shipper from form data
    const requestData = {
      createdVia: 'DRIVER_MANUAL',
      callbackId: callbackId || undefined, // Link to callback if provided
      shipperId: selectedShipperId || undefined, // Only include if shipper was selected from autocomplete
      // If no shipperId, include all shipper fields for API to create new shipper
      ...(selectedShipperId ? {} : {
        companyName: newShipperData.companyName,
        email: newShipperData.email,
        contactName: newShipperData.contactName,
        phone: newShipperData.phone,
        clientType: newShipperData.clientType,
      }),
      // Creator driver ID (the driver creating the load)
      driverId: driver.id,
      // Assign to specific driver if selected (different from creator)
      assignedDriverId: selectedDriverId || undefined,
      // Basic info
      pickupFacilityName: data.pickupFacilityName || 'Manual Entry',
      pickupAddressLine1: data.pickupAddressLine1 || '',
      pickupCity: data.pickupCity || '',
      pickupState: data.pickupState || '',
      pickupPostalCode: data.pickupPostalCode || '',
      pickupContactName: data.pickupContactName || '',
      pickupContactPhone: data.pickupContactPhone || '',
      // Dropoff
      dropoffFacilityName: data.dropoffFacilityName || 'Manual Entry',
      dropoffAddressLine1: data.dropoffAddressLine1 || '',
      dropoffCity: data.dropoffCity || '',
      dropoffState: data.dropoffState || '',
      dropoffPostalCode: data.dropoffPostalCode || '',
      dropoffContactName: data.dropoffContactName || '',
      dropoffContactPhone: data.dropoffContactPhone || '',
      // Service details
      serviceType: data.serviceType || 'OTHER',
      commodityDescription: data.commodityDescription || 'Manual entry - see documents',
      specimenCategory: data.specimenCategory || 'OTHER',
      temperatureRequirement: data.temperatureRequirement || 'AMBIENT',
      // Scheduling
      readyTime: data.readyTime || new Date().toISOString(),
      deliveryDeadline: data.deliveryDeadline || new Date().toISOString(),
      isRecurring: data.isRecurring === true || data.isRecurring === 'true',
      directDriveRequired: data.directDriveRequired === true || data.directDriveRequired === 'true',
      // Compliance & Handling
      chainOfCustodyRequired: data.chainOfCustodyRequired === true || data.chainOfCustodyRequired === 'true',
      signatureRequiredAtPickup: data.signatureRequiredAtPickup !== false && data.signatureRequiredAtPickup !== 'false',
      signatureRequiredAtDelivery: data.signatureRequiredAtDelivery !== false && data.signatureRequiredAtDelivery !== 'false',
      electronicPodAcceptable: data.electronicPodAcceptable !== false && data.electronicPodAcceptable !== 'false',
      temperatureLoggingRequired: data.temperatureLoggingRequired === true || data.temperatureLoggingRequired === 'true',
      driverInstructions: data.driverInstructions || null,
      // Billing & Internal Ops
      poNumber: data.poNumber || null,
      priorityLevel: data.priorityLevel || 'NORMAL',
      tags: data.tags ? (Array.isArray(data.tags) ? JSON.stringify(data.tags) : data.tags) : null,
      // Notes
      notes: data.notes || '',
      // Quoted Rate (final negotiated rate)
      quotedRate: data.quotedRate ? parseFloat(data.quotedRate) : null,
    }

    try {
      const response = await fetch('/api/load-requests/driver-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create load record')
      }

      const result = await response.json()
      setLoadId(result.loadId || result.id)
      showToast.success(`Load record created: ${result.trackingCode}`)
      
      // Delete draft after successful submission
      if (draftId) {
        await deleteDraft()
      }
      
      setShowDocumentUpload(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setError(errorMessage)
      setIsSubmitting(false)
    }
  }

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !uploadTitle || !loadId) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('type', uploadType)
      formData.append('title', uploadTitle)
      formData.append('uploadedBy', 'driver')

      const response = await fetch(`/api/load-requests/${loadId}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to upload document')
      }

      showToast.success('Document uploaded successfully!')
      
      // Add to uploaded documents list
      setUploadedDocuments([...uploadedDocuments, { title: uploadTitle, type: uploadType }])
      
      // Reset form for next upload
      setUploadFile(null)
      setUploadTitle('')
      setUploadType('PROOF_OF_PICKUP')
    } catch (error) {
      console.error('Error uploading document:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document'
      showToast.error('Upload failed', errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  if (!driver) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[100px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center gap-4">
          <Link
            href="/driver/dashboard"
            className="text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">Record Manual Load</h1>
            <p className="text-slate-400">
              Document a load that wasn't created through the system (e.g., from email, phone call, or direct request)
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Workflow Explanation Banner */}
        <div className="glass p-6 rounded-xl mb-6 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Creating a Load for Shipper</h3>
              <p className="text-sm text-blue-800 mb-2">
                When you create a load here, the shipper will automatically receive a confirmation email with all details including:
              </p>
              <ul className="text-sm text-blue-800 ml-4 list-disc space-y-1">
                <li>Complete load details (pickup, delivery, timing)</li>
                <li>Rate information (if calculated)</li>
                <li>Link to track the shipment</li>
                <li>Option to sign up for portal access</li>
              </ul>
              <p className="text-sm text-blue-800 mt-2 font-medium">
                The load is immediately active and trackable. The shipper can optionally sign up to manage it in their portal, 
                but the load continues normally either way.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="glass p-4 rounded-lg border-l-4 border-red-500 mb-6 bg-red-50/50">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-1">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!showDocumentUpload ? (
          <form onSubmit={handleSubmit} className="space-y-8" onChange={(e) => {
            const form = e.currentTarget as HTMLFormElement
            const formDataObj = new FormData(form)
            const data = Object.fromEntries(formDataObj.entries())
            setFormData((prev: any) => ({ ...prev, ...data }))
          }}>
            {/* Shipper Selection */}
            <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-4">Shipper / Client</h3>
              <p className="text-sm text-slate-400 mb-4">
                Select an existing shipper or create a new one for this load.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">New Shipper Information</h4>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="shipperCompanyName" className="block text-sm font-semibold text-slate-300 mb-2">
                      Company Name <span className="text-red-400">*</span>
                    </label>
                    <ShipperAutocomplete
                      id="shipperCompanyName"
                      value={newShipperData.companyName}
                      onChange={(value) => {
                        setNewShipperData({ ...newShipperData, companyName: value })
                        // Clear selected shipper if user is typing a new name
                        if (!value || value !== selectedShipperData?.companyName) {
                          setSelectedShipperData(null)
                          setSelectedShipperId('')
                        }
                      }}
                      onShipperSelect={(shipper) => {
                        setSelectedShipperData(shipper)
                        setSelectedShipperId(shipper.id)
                        // Auto-populate all fields when shipper is selected
                        setNewShipperData({
                          companyName: shipper.companyName,
                          email: shipper.email,
                          contactName: shipper.contactName,
                          phone: shipper.phone,
                          clientType: shipper.clientType,
                        })
                        showToast.success(`Selected: ${shipper.companyName}`)
                      }}
                      placeholder="Type company name to search or enter new..."
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      required
                    />
                    {selectedShipperData && (
                      <div className="mt-1 space-y-1">
                        <p className="text-xs text-green-400 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Found existing shipper - fields auto-populated
                        </p>
                        {selectedShipperData.shipperCode && (
                          <p className="text-xs text-cyan-400 font-medium">
                            Client ID: <span className="font-bold">{selectedShipperData.shipperCode}</span>
                          </p>
                        )}
                      </div>
                    )}
                    {!selectedShipperData && newShipperData.companyName && (
                      <p className="text-xs text-cyan-400 mt-1">
                        New shipper will be created when you submit the load
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="newShipperEmail" className="block text-sm font-semibold text-slate-300 mb-2">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      id="newShipperEmail"
                      value={newShipperData.email}
                      onChange={(e) => setNewShipperData({ ...newShipperData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="newShipperContactName" className="block text-sm font-semibold text-slate-300 mb-2">
                      Contact Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="newShipperContactName"
                      value={newShipperData.contactName}
                      onChange={(e) => setNewShipperData({ ...newShipperData, contactName: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="newShipperPhone" className="block text-sm font-semibold text-slate-300 mb-2">
                      Phone <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      id="newShipperPhone"
                      value={newShipperData.phone}
                      onChange={(e) => setNewShipperData({ ...newShipperData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="newShipperClientType" className="block text-sm font-semibold text-slate-300 mb-2">
                      Client Type
                    </label>
                    <select
                      id="newShipperClientType"
                      value={newShipperData.clientType}
                      onChange={(e) => setNewShipperData({ ...newShipperData, clientType: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                    >
                      <option value="OTHER">Other</option>
                      <option value="CLINIC">Clinic</option>
                      <option value="LAB">Lab</option>
                      <option value="HOSPITAL">Hospital</option>
                      <option value="PHARMACY">Pharmacy</option>
                      <option value="DIALYSIS_CENTER">Dialysis Center</option>
                      <option value="IMAGING_CENTER">Imaging Center</option>
                      <option value="GOVERNMENT">Government</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-6">Load Information</h3>
              <p className="text-sm text-slate-400 mb-4">
                Enter basic information about the load. You can add documents after creating the record.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="serviceType" className="block text-sm font-semibold text-slate-300 mb-2">
                    Service Type
                  </label>
                  <select
                    id="serviceType"
                    name="serviceType"
                    value={formData.serviceType || 'OTHER'}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                    required
                  >
                    <option value="STAT">STAT (Urgent)</option>
                    <option value="CRITICAL_STAT">Critical STAT (Life-Threatening)</option>
                    <option value="ROUTINE">Routine</option>
                    <option value="SAME_DAY">Same Day</option>
                    <option value="SCHEDULED_ROUTE">Scheduled Route</option>
                    <option value="OVERFLOW">Overflow</option>
                    <option value="GOVERNMENT">Government</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="assignedDriver" className="block text-sm font-semibold text-slate-300 mb-2">
                    Load Assigned To
                  </label>
                  <select
                    id="assignedDriver"
                    name="assignedDriver"
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                  >
                    <option value="">Select a driver (optional)</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.firstName} {d.lastName} 
                        {d.status === 'ON_LOAD' ? ' (On Load)' : d.status === 'AVAILABLE' ? ' (Available)' : ''} 
                        {d.id === driver?.id ? ' (You)' : ''} - {d.email}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Optional: Assign this load to a specific driver during creation
                  </p>
                </div>
                <div>
                  <label htmlFor="commodityDescription" className="block text-sm font-semibold text-slate-300 mb-2">
                    Commodity Description
                  </label>
                  <input
                    type="text"
                    id="commodityDescription"
                    name="commodityDescription"
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    placeholder="e.g., Blood samples, Lab specimens"
                  />
                </div>
                <div>
                  <label htmlFor="specimenCategory" className="block text-sm font-semibold text-slate-300 mb-2">
                    Specimen Category
                  </label>
                  <select
                    id="specimenCategory"
                    name="specimenCategory"
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                  >
                    <option value="UN3373_CATEGORY_B">UN3373 Category B</option>
                    <option value="UN3373">UN3373 (Legacy)</option>
                    <option value="NON_SPECIMEN">Non-Specimen Medical</option>
                    <option value="PHARMACEUTICAL">Pharmaceutical (Non-Controlled)</option>
                    <option value="SUPPLIES">Supplies</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="PAPERWORK">Paperwork</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="temperatureRequirement" className="block text-sm font-semibold text-slate-300 mb-2">
                    Temperature Requirement
                  </label>
                  <select
                    id="temperatureRequirement"
                    name="temperatureRequirement"
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                  >
                    <option value="AMBIENT">Ambient</option>
                    <option value="REFRIGERATED">Refrigerated (2-8°C)</option>
                    <option value="FROZEN">Frozen</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="readyTime" className="block text-sm font-semibold text-slate-300 mb-2">
                    Pickup Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    id="readyTime"
                    name="readyTime"
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                  />
                </div>
                <div>
                  <label htmlFor="deliveryDeadline" className="block text-sm font-semibold text-slate-300 mb-2">
                    Delivery Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    id="deliveryDeadline"
                    name="deliveryDeadline"
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      name="isRecurring"
                      checked={formData.isRecurring || false}
                      onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600/50 text-cyan-600 focus:ring-cyan-500 bg-slate-800/50"
                    />
                    <span className="text-sm font-semibold text-slate-300">This is a recurring load</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="directDriveRequired"
                      name="directDriveRequired"
                      checked={formData.directDriveRequired || false}
                      onChange={(e) => setFormData({ ...formData, directDriveRequired: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600/50 text-cyan-600 focus:ring-cyan-500 bg-slate-800/50"
                    />
                    <span className="text-sm font-semibold text-slate-300">Direct drive required (no other stops)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Pickup Location */}
            <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-6">Pickup Location</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="pickupFacilityName" className="block text-sm font-semibold text-slate-300 mb-2">
                    Facility Name
                  </label>
                  <FacilityAutocomplete
                    id="pickupFacilityName"
                    name="pickupFacilityName"
                    value={formData.pickupFacilityName || ''}
                    onChange={(name) => setFormData({ ...formData, pickupFacilityName: name })}
                    onFacilitySelect={(facilityData) => {
                      console.log('Pickup facility selected:', facilityData)
                      setFormData((prev: any) => ({
                        ...prev,
                        pickupFacilityName: facilityData.name,
                        pickupAddressLine1: facilityData.addressLine1,
                        pickupCity: facilityData.city,
                        pickupState: facilityData.state,
                        pickupPostalCode: facilityData.postalCode,
                        pickupContactPhone: facilityData.phone || prev.pickupContactPhone || '',
                      }))
                    }}
                    placeholder="Search for facility (e.g., Lab Corp, Quest Diagnostics)..."
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    useLocation={true}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Start typing to search. Results will be biased toward your current location if available.
                  </p>
                  {/* Hidden input to ensure facility name is included in form submission */}
                  <input
                    type="hidden"
                    name="pickupFacilityName"
                    value={formData.pickupFacilityName || ''}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="pickupAddressLine1" className="block text-sm font-semibold text-slate-300 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    id="pickupAddressLine1"
                    name="pickupAddressLine1"
                    value={formData.pickupAddressLine1 || ''}
                    onChange={(e) => setFormData({ ...formData, pickupAddressLine1: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="pickupCity" className="block text-sm font-semibold text-slate-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    id="pickupCity"
                    name="pickupCity"
                    value={formData.pickupCity || ''}
                    onChange={(e) => setFormData({ ...formData, pickupCity: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="pickupState" className="block text-sm font-semibold text-slate-300 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    id="pickupState"
                    name="pickupState"
                    value={formData.pickupState || ''}
                    onChange={(e) => setFormData({ ...formData, pickupState: e.target.value.toUpperCase() })}
                    maxLength={2}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 uppercase"
                    placeholder="TX"
                  />
                </div>
                <div>
                  <label htmlFor="pickupPostalCode" className="block text-sm font-semibold text-slate-300 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    id="pickupPostalCode"
                    name="pickupPostalCode"
                    value={formData.pickupPostalCode || ''}
                    onChange={(e) => setFormData({ ...formData, pickupPostalCode: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="pickupContactPhone" className="block text-sm font-semibold text-slate-300 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    id="pickupContactPhone"
                    name="pickupContactPhone"
                    value={formData.pickupContactPhone || ''}
                    onChange={(e) => setFormData({ ...formData, pickupContactPhone: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Location */}
            <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-6">Delivery Location</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="dropoffFacilityName" className="block text-sm font-semibold text-slate-300 mb-2">
                    Facility Name
                  </label>
                  <FacilityAutocomplete
                    id="dropoffFacilityName"
                    name="dropoffFacilityName"
                    value={formData.dropoffFacilityName || ''}
                    onChange={(name) => setFormData({ ...formData, dropoffFacilityName: name })}
                    onFacilitySelect={(facilityData) => {
                      console.log('Dropoff facility selected:', facilityData)
                      setFormData((prev: any) => ({
                        ...prev,
                        dropoffFacilityName: facilityData.name,
                        dropoffAddressLine1: facilityData.addressLine1,
                        dropoffCity: facilityData.city,
                        dropoffState: facilityData.state,
                        dropoffPostalCode: facilityData.postalCode,
                        dropoffContactPhone: facilityData.phone || prev.dropoffContactPhone || '',
                      }))
                    }}
                    placeholder="Search for facility (e.g., Lab Corp, Quest Diagnostics)..."
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    useLocation={true}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Start typing to search. Results will be biased toward your current location if available.
                  </p>
                  {/* Hidden input to ensure facility name is included in form submission */}
                  <input
                    type="hidden"
                    name="dropoffFacilityName"
                    value={formData.dropoffFacilityName || ''}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="dropoffAddressLine1" className="block text-sm font-semibold text-slate-300 mb-2">
                    Address <span className="text-red-400" title="Required">*</span>
                  </label>
                  <AddressAutocomplete
                    id="dropoffAddressLine1"
                    name="dropoffAddressLine1"
                    value={formData.dropoffAddressLine1 || ''}
                    onChange={(value) => setFormData({ ...formData, dropoffAddressLine1: value })}
                    placeholder="Enter full address"
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="dropoffCity" className="block text-sm font-semibold text-slate-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    id="dropoffCity"
                    name="dropoffCity"
                    value={formData.dropoffCity || ''}
                    onChange={(e) => setFormData({ ...formData, dropoffCity: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="dropoffState" className="block text-sm font-semibold text-slate-300 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    id="dropoffState"
                    name="dropoffState"
                    value={formData.dropoffState || ''}
                    onChange={(e) => setFormData({ ...formData, dropoffState: e.target.value.toUpperCase() })}
                    maxLength={2}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 uppercase"
                    placeholder="TX"
                  />
                </div>
                <div>
                  <label htmlFor="dropoffPostalCode" className="block text-sm font-semibold text-slate-300 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    id="dropoffPostalCode"
                    name="dropoffPostalCode"
                    value={formData.dropoffPostalCode || ''}
                    onChange={(e) => setFormData({ ...formData, dropoffPostalCode: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="dropoffContactPhone" className="block text-sm font-semibold text-slate-300 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    id="dropoffContactPhone"
                    name="dropoffContactPhone"
                    value={formData.dropoffContactPhone || ''}
                    onChange={(e) => setFormData({ ...formData, dropoffContactPhone: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Compliance & Handling */}
            <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-6">Compliance & Handling</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="chainOfCustodyRequired"
                      name="chainOfCustodyRequired"
                      checked={formData.chainOfCustodyRequired || false}
                      onChange={(e) => setFormData({ ...formData, chainOfCustodyRequired: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600/50 text-cyan-600 focus:ring-cyan-500 bg-slate-800/50"
                    />
                    <span className="text-sm font-semibold text-slate-300">Chain-of-custody required</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="signatureRequiredAtPickup"
                      name="signatureRequiredAtPickup"
                      checked={formData.signatureRequiredAtPickup !== false}
                      onChange={(e) => setFormData({ ...formData, signatureRequiredAtPickup: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600/50 text-cyan-600 focus:ring-cyan-500 bg-slate-800/50"
                    />
                    <span className="text-sm font-semibold text-slate-300">Signature required at pickup</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="signatureRequiredAtDelivery"
                      name="signatureRequiredAtDelivery"
                      checked={formData.signatureRequiredAtDelivery !== false}
                      onChange={(e) => setFormData({ ...formData, signatureRequiredAtDelivery: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600/50 text-cyan-600 focus:ring-cyan-500 bg-slate-800/50"
                    />
                    <span className="text-sm font-semibold text-slate-300">Signature required at delivery</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="electronicPodAcceptable"
                      name="electronicPodAcceptable"
                      checked={formData.electronicPodAcceptable !== false}
                      onChange={(e) => setFormData({ ...formData, electronicPodAcceptable: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600/50 text-cyan-600 focus:ring-cyan-500 bg-slate-800/50"
                    />
                    <span className="text-sm font-semibold text-slate-300">Electronic POD acceptable</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="temperatureLoggingRequired"
                      name="temperatureLoggingRequired"
                      checked={formData.temperatureLoggingRequired || false}
                      onChange={(e) => setFormData({ ...formData, temperatureLoggingRequired: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600/50 text-cyan-600 focus:ring-cyan-500 bg-slate-800/50"
                    />
                    <span className="text-sm font-semibold text-slate-300">Temperature logging required</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="driverInstructions" className="block text-sm font-semibold text-slate-300 mb-2">
                    Driver Instructions / Special Handling Notes
                  </label>
                  <textarea
                    id="driverInstructions"
                    name="driverInstructions"
                    rows={3}
                    value={formData.driverInstructions || ''}
                    onChange={(e) => setFormData({ ...formData, driverInstructions: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    placeholder="Any special instructions for the driver or handling requirements..."
                  />
                </div>
              </div>
            </div>

            {/* Billing & Internal Ops */}
            <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-6">Billing & Internal Operations</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="poNumber" className="block text-sm font-semibold text-slate-300 mb-2">
                    PO or Reference Number
                  </label>
                  <input
                    type="text"
                    id="poNumber"
                    name="poNumber"
                    value={formData.poNumber || ''}
                    onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    placeholder="e.g., PO-12345"
                  />
                </div>
                <div>
                  <label htmlFor="priorityLevel" className="block text-sm font-semibold text-slate-300 mb-2">
                    Priority Level
                  </label>
                  <select
                    id="priorityLevel"
                    name="priorityLevel"
                    value={formData.priorityLevel || 'NORMAL'}
                    onChange={(e) => setFormData({ ...formData, priorityLevel: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="tags" className="block text-sm font-semibold text-slate-300 mb-2">
                    Tags / Labels (comma-separated)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags || ''}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    placeholder="e.g., urgent, fragile, time-sensitive"
                  />
                  <p className="mt-1 text-xs text-slate-500">Separate multiple tags with commas</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-6">Additional Notes</h3>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                placeholder="Any additional information about this load..."
              />
            </div>

            {/* Rate Calculator */}
            <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-6">Rate Calculator</h3>
              <p className="text-sm text-slate-400 mb-4">
                Calculate the suggested rate for this load based on distance and service type. This helps you negotiate fair pricing.
              </p>
              <RateCalculator
                pickupAddress={`${formData.pickupAddressLine1 || ''}, ${formData.pickupCity || ''}, ${formData.pickupState || ''} ${formData.pickupPostalCode || ''}`.trim()}
                dropoffAddress={`${formData.dropoffAddressLine1 || ''}, ${formData.dropoffCity || ''}, ${formData.dropoffState || ''} ${formData.dropoffPostalCode || ''}`.trim()}
                serviceType={formData.serviceType || 'OTHER'}
                showDeadhead={true}
                isManualLoad={true}
                onQuoteSet={(rate) => {
                  setFormData((prev: any) => ({ ...prev, quotedRate: rate.toString() }))
                }}
              />
              
              {/* Set Final Quoted Rate - Before Load Creation */}
              <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-3">
                <p className="text-sm font-semibold text-slate-300 mb-2">
                  Set Final Quoted Rate (After Negotiation)
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  Enter the final agreed-upon rate with the customer. This will be included in the confirmation email to the shipper.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="quotedRate"
                      name="quotedRate"
                      value={formData.quotedRate || ''}
                      onChange={(e) => setFormData({ ...formData, quotedRate: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    />
                  </div>
                </div>
                {formData.quotedRate && parseFloat(formData.quotedRate) > 0 && (
                  <p className="text-xs text-green-700 bg-green-50 p-2 rounded">
                    ✓ Final quoted rate: ${parseFloat(formData.quotedRate).toFixed(2)} will be included in the confirmation email.
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-6">
              <Link
                href="/driver/documents"
                className="px-6 py-3 text-slate-300 hover:text-slate-200 font-semibold transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Record & Upload Documents
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="glass-primary p-6 rounded-xl border-l-4 border-green-500 bg-green-500/20">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-green-400 mb-1">Load Record Created Successfully!</h3>
                  <p className="text-sm text-green-300">
                    Your load record has been created. Now you can upload documents to keep a complete record.
                  </p>
                </div>
              </div>
            </div>

            {/* Document Upload Section */}
            <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">Upload Documents</h3>
                  <p className="text-slate-400 mt-1">
                    Add documents for this load (proof of pickup, delivery, receipts, etc.)
                  </p>
                </div>
                <Link
                  href={`/driver/loads/${loadId}`}
                  className="px-4 py-2 text-slate-300 hover:text-slate-200 font-medium transition-colors text-sm"
                >
                  View Load →
                </Link>
              </div>
              
              <form onSubmit={handleDocumentUpload} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="uploadTitle" className="block text-sm font-semibold text-slate-300 mb-2">
                      Document Title *
                    </label>
                    <input
                      type="text"
                      id="uploadTitle"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      placeholder="e.g., Proof of Pickup - Hospital ABC"
                    />
                  </div>
                  <div>
                    <label htmlFor="uploadType" className="block text-sm font-semibold text-slate-300 mb-2">
                      Document Type *
                    </label>
                    <select
                      id="uploadType"
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                    >
                      <option value="PROOF_OF_PICKUP">Proof of Pickup</option>
                      <option value="PROOF_OF_DELIVERY">Proof of Delivery</option>
                      <option value="BILL_OF_LADING">Bill of Lading</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="uploadFile" className="block text-sm font-semibold text-slate-300 mb-2">
                    File *
                  </label>
                  <div className="mt-1">
                    <label
                      htmlFor="uploadFile"
                      className="flex flex-col justify-center items-center w-full h-32 px-6 pt-5 pb-6 border-2 border-slate-600/50 border-dashed rounded-lg cursor-pointer hover:border-slate-500 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-slate-400">
                          <span className="font-medium text-slate-300 hover:text-slate-200">Click to upload</span>
                          <span className="pl-1">or drag and drop</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          PDF, JPG, PNG, HEIC up to 10MB
                        </p>
                        {uploadFile && (
                          <p className="text-sm text-slate-300 mt-2 font-medium">
                            Selected: {uploadFile.name}
                          </p>
                        )}
                      </div>
                      <input
                        id="uploadFile"
                        name="uploadFile"
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        required
                        accept=".pdf,.jpg,.jpeg,.png,.heic"
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                {/* Uploaded Documents List */}
                {uploadedDocuments.length > 0 && (
                  <div className="glass-primary p-6 rounded-xl border-t border-slate-700/50">
                    <h4 className="text-lg font-semibold text-white mb-4">
                      Uploaded Documents ({uploadedDocuments.length})
                    </h4>
                    <div className="space-y-2">
                      {uploadedDocuments.map((doc, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex-1">
                            <p className="font-medium text-white">{doc.title}</p>
                            <p className="text-sm text-slate-400">{doc.type.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-6 border-t border-slate-700/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/driver/loads/${loadId}`}
                      className="px-6 py-3 text-slate-300 hover:text-slate-200 font-semibold transition-colors"
                    >
                      {uploadedDocuments.length > 0 ? 'Done & View Load' : 'Skip & View Load'}
                    </Link>
                    <button
                      type="submit"
                      disabled={isUploading || !uploadFile || !uploadTitle}
                      className="px-8 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[180px] justify-center"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload Document
                        </>
                      )}
                    </button>
                  </div>
                  {uploadedDocuments.length > 0 && (
                    <div className="text-center">
                      <p className="text-sm text-slate-300">
                        ✓ {uploadedDocuments.length} document{uploadedDocuments.length !== 1 ? 's' : ''} uploaded successfully
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        You can upload more documents or click "Done & View Load" to finish
                      </p>
                    </div>
                  )}
                  {(!uploadFile || !uploadTitle) && (
                    <div className="text-center">
                      <p className="text-xs text-slate-500">
                        Please fill in the document title and select a file to upload
                      </p>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DriverManualLoadPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <DriverManualLoadPageContent />
    </Suspense>
  )
}


