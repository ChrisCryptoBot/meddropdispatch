'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ShipperRequestLoadPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }
    setShipper(JSON.parse(shipperData))
  }, [router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    // Add shipper ID to the request (so it uses logged-in shipper)
    const requestData = {
      ...data,
      shipperId: shipper.id,
      // Use shipper's email for the request
      email: shipper.email,
      companyName: shipper.companyName,
      contactName: shipper.contactName,
      phone: shipper.phone,
    }

    try {
      const response = await fetch('/api/load-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Prioritize user-friendly error message, fallback to details, then generic message
        const errorMsg = errorData.error || errorData.message || errorData.details || 'Failed to submit request'
        throw new Error(errorMsg)
      }

      const result = await response.json()

      // Redirect to shipper dashboard with success
      router.push(`/shipper/dashboard?success=true&trackingCode=${result.trackingCode}`)
    } catch (err) {
      let errorMessage = 'Something went wrong. Please try again.'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      
      setError(errorMessage)
      setIsSubmitting(false)
      
      // Log full error for debugging
      console.error('Load request submission error:', err)
    }
  }

  if (!shipper) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Request a Pickup</h1>
          <p className="text-lg text-gray-600">
            Fill out the form below to request medical courier service. We'll review and provide a quote shortly.
          </p>
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
                <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Company Information - Pre-filled */}
          <div className="glass p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Company Information</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="companyName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  required
                  defaultValue={shipper.companyName}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="clientType" className="block text-sm font-semibold text-gray-700 mb-2">
                  Facility Type *
                </label>
                <select
                  id="clientType"
                  name="clientType"
                  required
                  defaultValue={shipper.clientType || ''}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
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
                <label htmlFor="contactName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  required
                  defaultValue={shipper.contactName}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  defaultValue={shipper.phone}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  defaultValue={shipper.email}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="preferredContactMethod" className="block text-sm font-semibold text-gray-700 mb-2">
                  Preferred Contact Method *
                </label>
                <select
                  id="preferredContactMethod"
                  name="preferredContactMethod"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                >
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pickup Details */}
          <div className="glass p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Pickup Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="pickupFacilityName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Facility Name *
                </label>
                <input
                  type="text"
                  id="pickupFacilityName"
                  name="pickupFacilityName"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="Main Medical Building"
                />
              </div>

              <div>
                <label htmlFor="pickupFacilityType" className="block text-sm font-semibold text-gray-700 mb-2">
                  Facility Type *
                </label>
                <select
                  id="pickupFacilityType"
                  name="pickupFacilityType"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
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
                <label htmlFor="pickupAddressLine1" className="block text-sm font-semibold text-gray-700 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  id="pickupAddressLine1"
                  name="pickupAddressLine1"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="pickupAddressLine2" className="block text-sm font-semibold text-gray-700 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  id="pickupAddressLine2"
                  name="pickupAddressLine2"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="pickupCity" className="block text-sm font-semibold text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  id="pickupCity"
                  name="pickupCity"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="pickupState" className="block text-sm font-semibold text-gray-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  id="pickupState"
                  name="pickupState"
                  required
                  maxLength={2}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm uppercase"
                  placeholder="TX"
                />
              </div>

              <div>
                <label htmlFor="pickupPostalCode" className="block text-sm font-semibold text-gray-700 mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  id="pickupPostalCode"
                  name="pickupPostalCode"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="pickupContactName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  id="pickupContactName"
                  name="pickupContactName"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="pickupContactPhone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  id="pickupContactPhone"
                  name="pickupContactPhone"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="readyTime" className="block text-sm font-semibold text-gray-700 mb-2">
                  Ready Time *
                </label>
                <input
                  type="datetime-local"
                  id="readyTime"
                  name="readyTime"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="pickupAccessNotes" className="block text-sm font-semibold text-gray-700 mb-2">
                  Access Notes
                </label>
                <textarea
                  id="pickupAccessNotes"
                  name="pickupAccessNotes"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="Building access codes, parking instructions, etc."
                />
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="glass p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Delivery Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="dropoffFacilityName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Facility Name *
                </label>
                <input
                  type="text"
                  id="dropoffFacilityName"
                  name="dropoffFacilityName"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="dropoffFacilityType" className="block text-sm font-semibold text-gray-700 mb-2">
                  Facility Type *
                </label>
                <select
                  id="dropoffFacilityType"
                  name="dropoffFacilityType"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
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
                <label htmlFor="dropoffAddressLine1" className="block text-sm font-semibold text-gray-700 mb-2">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  id="dropoffAddressLine1"
                  name="dropoffAddressLine1"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="dropoffAddressLine2" className="block text-sm font-semibold text-gray-700 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  id="dropoffAddressLine2"
                  name="dropoffAddressLine2"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="dropoffCity" className="block text-sm font-semibold text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  id="dropoffCity"
                  name="dropoffCity"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="dropoffState" className="block text-sm font-semibold text-gray-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  id="dropoffState"
                  name="dropoffState"
                  required
                  maxLength={2}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm uppercase"
                  placeholder="TX"
                />
              </div>

              <div>
                <label htmlFor="dropoffPostalCode" className="block text-sm font-semibold text-gray-700 mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  id="dropoffPostalCode"
                  name="dropoffPostalCode"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="dropoffContactName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  id="dropoffContactName"
                  name="dropoffContactName"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="dropoffContactPhone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  id="dropoffContactPhone"
                  name="dropoffContactPhone"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="deliveryDeadline" className="block text-sm font-semibold text-gray-700 mb-2">
                  Delivery Deadline *
                </label>
                <input
                  type="datetime-local"
                  id="deliveryDeadline"
                  name="deliveryDeadline"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div>
                <label htmlFor="dropoffAccessNotes" className="block text-sm font-semibold text-gray-700 mb-2">
                  Access Notes
                </label>
                <textarea
                  id="dropoffAccessNotes"
                  name="dropoffAccessNotes"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="Building access codes, parking instructions, etc."
                />
              </div>
            </div>
          </div>

          {/* Shipment Details */}
          <div className="glass p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Shipment Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="serviceType" className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Type *
                </label>
                <select
                  id="serviceType"
                  name="serviceType"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                >
                  <option value="">Select service...</option>
                  <option value="STAT">STAT (Urgent)</option>
                  <option value="SAME_DAY">Same Day</option>
                  <option value="SCHEDULED_ROUTE">Scheduled Route</option>
                  <option value="OVERFLOW">Overflow</option>
                  <option value="GOVERNMENT">Government</option>
                </select>
              </div>

              <div>
                <label htmlFor="specimenCategory" className="block text-sm font-semibold text-gray-700 mb-2">
                  Specimen Category *
                </label>
                <select
                  id="specimenCategory"
                  name="specimenCategory"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                >
                  <option value="">Select category...</option>
                  <option value="UN3373_CATEGORY_B">UN3373 Category B</option>
                  <option value="NON_SPECIMEN_MEDICAL">Non-Specimen Medical</option>
                  <option value="PHARMACEUTICAL_NON_CONTROLLED">Pharmaceutical (Non-Controlled)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="temperatureRequirement" className="block text-sm font-semibold text-gray-700 mb-2">
                  Temperature Requirement *
                </label>
                <select
                  id="temperatureRequirement"
                  name="temperatureRequirement"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                >
                  <option value="">Select requirement...</option>
                  <option value="AMBIENT">Ambient</option>
                  <option value="REFRIGERATED">Refrigerated (2-8°C)</option>
                  <option value="FROZEN">Frozen (-20°C or below)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="equipmentType" className="block text-sm font-semibold text-gray-700 mb-2">
                  Equipment Type
                </label>
                <input
                  type="text"
                  id="equipmentType"
                  name="equipmentType"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="e.g., Specimen box, cooler, etc."
                />
              </div>

              <div>
                <label htmlFor="estimatedContainers" className="block text-sm font-semibold text-gray-700 mb-2">
                  Estimated Containers
                </label>
                <input
                  type="number"
                  id="estimatedContainers"
                  name="estimatedContainers"
                  min="1"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="1"
                />
              </div>

              <div>
                <label htmlFor="estimatedWeightKg" className="block text-sm font-semibold text-gray-700 mb-2">
                  Estimated Weight (kg)
                </label>
                <input
                  type="number"
                  id="estimatedWeightKg"
                  name="estimatedWeightKg"
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="2.5"
                />
              </div>

              <div>
                <label htmlFor="declaredValue" className="block text-sm font-semibold text-gray-700 mb-2">
                  Declared Value (USD)
                </label>
                <input
                  type="number"
                  id="declaredValue"
                  name="declaredValue"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="500.00"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="commodityDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                  Commodity Description
                </label>
                <textarea
                  id="commodityDescription"
                  name="commodityDescription"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="Description of items being shipped..."
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="accessNotes" className="block text-sm font-semibold text-gray-700 mb-2">
                  Additional Instructions
                </label>
                <textarea
                  id="accessNotes"
                  name="accessNotes"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="Any special handling requirements, delivery instructions, or other important information..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/shipper/dashboard"
              className="px-8 py-4 rounded-xl text-gray-700 hover:bg-white/40 transition-base font-semibold border border-gray-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-base shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

