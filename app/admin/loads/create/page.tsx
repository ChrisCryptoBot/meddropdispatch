'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showToast, showApiError } from '@/lib/toast'

export default function AdminCreateLoadPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shippers, setShippers] = useState<any[]>([])
  const [selectedShipperId, setSelectedShipperId] = useState<string>('')
  const [showNewShipperForm, setShowNewShipperForm] = useState(false)

  useEffect(() => {
    const adminData = localStorage.getItem('admin')
    if (!adminData) {
      router.push('/admin/login')
      return
    }
    setAdmin(JSON.parse(adminData))
    fetchShippers()
  }, [router])

  const fetchShippers = async () => {
    try {
      const response = await fetch('/api/shippers')
      if (response.ok) {
        const data = await response.json()
        setShippers(data.shippers || [])
      }
    } catch (error) {
      console.error('Error fetching shippers:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    // If new shipper form is shown, create shipper first
    let finalShipperId = selectedShipperId

    if (showNewShipperForm) {
      try {
        const shipperResponse = await fetch('/api/shippers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: data.newCompanyName,
            clientType: data.newClientType,
            contactName: data.newContactName,
            phone: data.newPhone,
            email: data.newEmail,
          }),
        })

        if (!shipperResponse.ok) {
          throw new Error('Failed to create shipper')
        }

        const shipperData = await shipperResponse.json()
        finalShipperId = shipperData.shipper.id
      } catch (err) {
        setError('Failed to create shipper. Please try again.')
        setIsSubmitting(false)
        return
      }
    }

    if (!finalShipperId) {
      setError('Please select or create a shipper')
      setIsSubmitting(false)
      return
    }

    // Create load request
    // Map form data to API format
    const requestData = {
      shipperId: finalShipperId,
      createdVia: 'INTERNAL', // Mark as created by admin
      // Service details
      serviceType: data.serviceType,
      commodityDescription: data.commodityDescription,
      specimenCategory: data.specimenCategory,
      temperatureRequirement: data.temperatureRequirement,
      preferredContactMethod: data.preferredContactMethod || 'PHONE',
      // Pickup facility
      pickupFacilityName: data.pickupFacilityName,
      pickupFacilityType: data.pickupFacilityType,
      pickupAddressLine1: data.pickupAddressLine1,
      pickupAddressLine2: data.pickupAddressLine2 || '',
      pickupCity: data.pickupCity,
      pickupState: data.pickupState,
      pickupPostalCode: data.pickupPostalCode,
      pickupContactName: data.pickupContactName,
      pickupContactPhone: data.pickupContactPhone,
      pickupAccessNotes: data.pickupAccessNotes || '',
      // Dropoff facility
      dropoffFacilityName: data.dropoffFacilityName,
      dropoffFacilityType: data.dropoffFacilityType,
      dropoffAddressLine1: data.dropoffAddressLine1,
      dropoffAddressLine2: data.dropoffAddressLine2 || '',
      dropoffCity: data.dropoffCity,
      dropoffState: data.dropoffState,
      dropoffPostalCode: data.dropoffPostalCode,
      dropoffContactName: data.dropoffContactName,
      dropoffContactPhone: data.dropoffContactPhone,
      dropoffAccessNotes: data.dropoffAccessNotes || '',
      // Timing
      readyTime: data.readyTime,
      deliveryDeadline: data.deliveryDeadline,
      // Optional
      estimatedContainers: data.estimatedContainers ? parseInt(data.estimatedContainers as string) : undefined,
      estimatedWeightKg: data.estimatedWeightKg ? parseFloat(data.estimatedWeightKg as string) : undefined,
      declaredValue: data.declaredValue ? parseFloat(data.declaredValue as string) : undefined,
    }

    try {
      const response = await fetch('/api/load-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create load request')
      }

      const result = await response.json()
      showToast.success(`Load request created: ${result.trackingCode}`)
      router.push(`/admin/loads/${result.loadId || result.id}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong'
      setError(errorMessage)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header - Gold Standard Sticky */}
        <div className="sticky top-[85px] z-[55] mb-6 pb-2">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/admin/loads"
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tight">
              Create Load Request
            </h1>
          </div>
          <p className="text-slate-400 ml-10">
            Document a load request received via phone call or other method
          </p>
        </div>

        {error && (
          <div className="glass-primary p-4 rounded-lg border-l-4 border-red-500/50 mb-6 bg-red-500/20 border border-red-500/30 shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-red-400 mb-1">Error</h3>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Shipper Selection */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
            <h3 className="text-2xl font-bold text-white mb-6">Shipper Information</h3>
            
            {!showNewShipperForm ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="shipperId" className="block text-sm font-semibold text-slate-300 mb-2">
                    Select Existing Shipper *
                  </label>
                  <select
                    id="shipperId"
                    name="shipperId"
                    value={selectedShipperId}
                    onChange={(e) => setSelectedShipperId(e.target.value)}
                    required={!showNewShipperForm}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  >
                    <option value="">Select a shipper...</option>
                    {shippers.map((shipper) => (
                      <option key={shipper.id} value={shipper.id}>
                        {shipper.companyName} ({shipper.email})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewShipperForm(true)}
                  className="text-cyan-400 hover:text-cyan-300 font-medium text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Shipper
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">New Shipper Details</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewShipperForm(false)
                      setSelectedShipperId('')
                    }}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    Use Existing Shipper Instead
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label htmlFor="newCompanyName" className="block text-sm font-semibold text-slate-300 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="newCompanyName"
                      name="newCompanyName"
                      required={showNewShipperForm}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="newClientType" className="block text-sm font-semibold text-slate-300 mb-2">
                      Client Type *
                    </label>
                    <select
                      id="newClientType"
                      name="newClientType"
                      required={showNewShipperForm}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    >
                      <option value="">Select type...</option>
                      <option value="INDEPENDENT_PHARMACY">Independent Pharmacy</option>
                      <option value="CLINIC">Clinic</option>
                      <option value="LAB">Lab</option>
                      <option value="DIALYSIS_CENTER">Dialysis Center</option>
                      <option value="IMAGING_CENTER">Imaging Center</option>
                      <option value="HOSPITAL">Hospital</option>
                      <option value="GOVERNMENT">Government</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="newContactName" className="block text-sm font-semibold text-slate-300 mb-2">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      id="newContactName"
                      name="newContactName"
                      required={showNewShipperForm}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="newPhone" className="block text-sm font-semibold text-slate-300 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="newPhone"
                      name="newPhone"
                      required={showNewShipperForm}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="newEmail" className="block text-sm font-semibold text-slate-300 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="newEmail"
                      name="newEmail"
                      required={showNewShipperForm}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Service Details */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
            <h3 className="text-2xl font-bold text-white mb-6">Service Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="serviceType" className="block text-sm font-semibold text-slate-300 mb-2">
                  Service Type *
                </label>
                <select
                  id="serviceType"
                  name="serviceType"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                >
                  <option value="STAT">STAT (Urgent)</option>
                  <option value="SAME_DAY">Same Day</option>
                  <option value="SCHEDULED_ROUTE">Scheduled Route</option>
                  <option value="OVERFLOW">Overflow</option>
                  <option value="GOVERNMENT">Government</option>
                </select>
              </div>
              <div>
                <label htmlFor="commodityDescription" className="block text-sm font-semibold text-slate-300 mb-2">
                  Commodity Description *
                </label>
                <input
                  type="text"
                  id="commodityDescription"
                  name="commodityDescription"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="e.g., Blood samples, Lab specimens"
                />
              </div>
              <div>
                <label htmlFor="specimenCategory" className="block text-sm font-semibold text-slate-300 mb-2">
                  Specimen Category *
                </label>
                <select
                  id="specimenCategory"
                  name="specimenCategory"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                >
                  <option value="UN3373">UN3373 Category B</option>
                  <option value="NON_SPECIMEN">Non-Specimen Medical</option>
                  <option value="PHARMACEUTICAL">Pharmaceutical (Non-Controlled)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="temperatureRequirement" className="block text-sm font-semibold text-slate-300 mb-2">
                  Temperature Requirement *
                </label>
                <select
                  id="temperatureRequirement"
                  name="temperatureRequirement"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                >
                  <option value="AMBIENT">Ambient</option>
                  <option value="REFRIGERATED">Refrigerated (2-8°C)</option>
                  <option value="FROZEN">Frozen</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="preferredContactMethod" className="block text-sm font-semibold text-slate-300 mb-2">
                  Preferred Contact Method *
                </label>
                <select
                  id="preferredContactMethod"
                  name="preferredContactMethod"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                >
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pickup Details */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
            <h3 className="text-2xl font-bold text-white mb-6">Pickup Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="pickupFacilityName" className="block text-sm font-semibold text-slate-300 mb-2">
                  Facility Name *
                </label>
                <input
                  type="text"
                  id="pickupFacilityName"
                  name="pickupFacilityName"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="pickupFacilityType" className="block text-sm font-semibold text-slate-300 mb-2">
                  Facility Type *
                </label>
                <select
                  id="pickupFacilityType"
                  name="pickupFacilityType"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  defaultValue="OTHER"
                >
                  <option value="CLINIC">Clinic</option>
                  <option value="LAB">Lab</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="DIALYSIS">Dialysis Center</option>
                  <option value="IMAGING">Imaging Center</option>
                  <option value="GOVERNMENT">Government Facility</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="pickupAddressLine1" className="block text-sm font-semibold text-slate-300 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  id="pickupAddressLine1"
                  name="pickupAddressLine1"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="pickupAddressLine2" className="block text-sm font-semibold text-slate-300 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  id="pickupAddressLine2"
                  name="pickupAddressLine2"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="pickupCity" className="block text-sm font-semibold text-slate-300 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  id="pickupCity"
                  name="pickupCity"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="pickupState" className="block text-sm font-semibold text-slate-300 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  id="pickupState"
                  name="pickupState"
                  required
                  maxLength={2}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 uppercase"
                  placeholder="TX"
                />
              </div>
              <div>
                <label htmlFor="pickupPostalCode" className="block text-sm font-semibold text-slate-300 mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  id="pickupPostalCode"
                  name="pickupPostalCode"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="pickupContactName" className="block text-sm font-semibold text-slate-300 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  id="pickupContactName"
                  name="pickupContactName"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="pickupContactPhone" className="block text-sm font-semibold text-slate-300 mb-2">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  id="pickupContactPhone"
                  name="pickupContactPhone"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="readyTime" className="block text-sm font-semibold text-slate-300 mb-2">
                  Ready Time *
                </label>
                <input
                  type="datetime-local"
                  id="readyTime"
                  name="readyTime"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="pickupAccessNotes" className="block text-sm font-semibold text-slate-300 mb-2">
                  Access Notes
                </label>
                <textarea
                  id="pickupAccessNotes"
                  name="pickupAccessNotes"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="Building access codes, parking instructions, etc."
                />
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
            <h3 className="text-2xl font-bold text-white mb-6">Delivery Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="dropoffFacilityName" className="block text-sm font-semibold text-slate-300 mb-2">
                  Facility Name *
                </label>
                <input
                  type="text"
                  id="dropoffFacilityName"
                  name="dropoffFacilityName"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="dropoffFacilityType" className="block text-sm font-semibold text-slate-300 mb-2">
                  Facility Type *
                </label>
                <select
                  id="dropoffFacilityType"
                  name="dropoffFacilityType"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  defaultValue="OTHER"
                >
                  <option value="CLINIC">Clinic</option>
                  <option value="LAB">Lab</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="DIALYSIS">Dialysis Center</option>
                  <option value="IMAGING">Imaging Center</option>
                  <option value="GOVERNMENT">Government Facility</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="dropoffAddressLine1" className="block text-sm font-semibold text-slate-300 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  id="dropoffAddressLine1"
                  name="dropoffAddressLine1"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="dropoffAddressLine2" className="block text-sm font-semibold text-slate-300 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  id="dropoffAddressLine2"
                  name="dropoffAddressLine2"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="dropoffCity" className="block text-sm font-semibold text-slate-300 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  id="dropoffCity"
                  name="dropoffCity"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="dropoffState" className="block text-sm font-semibold text-slate-300 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  id="dropoffState"
                  name="dropoffState"
                  required
                  maxLength={2}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 uppercase"
                  placeholder="TX"
                />
              </div>
              <div>
                <label htmlFor="dropoffPostalCode" className="block text-sm font-semibold text-slate-300 mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  id="dropoffPostalCode"
                  name="dropoffPostalCode"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="dropoffContactName" className="block text-sm font-semibold text-slate-300 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  id="dropoffContactName"
                  name="dropoffContactName"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="dropoffContactPhone" className="block text-sm font-semibold text-slate-300 mb-2">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  id="dropoffContactPhone"
                  name="dropoffContactPhone"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="deliveryDeadline" className="block text-sm font-semibold text-slate-300 mb-2">
                  Delivery Deadline *
                </label>
                <input
                  type="datetime-local"
                  id="deliveryDeadline"
                  name="deliveryDeadline"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="dropoffAccessNotes" className="block text-sm font-semibold text-slate-300 mb-2">
                  Access Notes
                </label>
                <textarea
                  id="dropoffAccessNotes"
                  name="dropoffAccessNotes"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="Building access codes, parking instructions, etc."
                />
              </div>
            </div>
          </div>

          {/* Optional Details */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50 shadow-lg">
            <h3 className="text-2xl font-bold text-white mb-6">Additional Details (Optional)</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="estimatedContainers" className="block text-sm font-semibold text-slate-300 mb-2">
                  Estimated Containers
                </label>
                <input
                  type="number"
                  id="estimatedContainers"
                  name="estimatedContainers"
                  min="1"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="estimatedWeightKg" className="block text-sm font-semibold text-slate-300 mb-2">
                  Estimated Weight (kg)
                </label>
                <input
                  type="number"
                  id="estimatedWeightKg"
                  name="estimatedWeightKg"
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label htmlFor="declaredValue" className="block text-sm font-semibold text-slate-300 mb-2">
                  Declared Value ($)
                </label>
                <input
                  type="number"
                  id="declaredValue"
                  name="declaredValue"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-6">
            <Link
              href="/admin/loads"
              className="px-6 py-3 text-slate-300 hover:text-white font-semibold transition-colors"
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
                  Create Load Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

