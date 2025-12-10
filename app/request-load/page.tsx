'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RequestLoadPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    try {
      const response = await fetch('/api/load-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit request')
      }

      const result = await response.json()

      // Redirect to tracking page with success message
      router.push(`/request-load/success?trackingCode=${result.trackingCode}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">MD</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient">MED DROP</h1>
                <p className="text-xs text-gray-600">Medical Courier Services</p>
              </div>
            </Link>
            <Link
              href="/track"
              className="text-gray-700 hover:text-primary-600 transition-base font-medium"
            >
              Track Shipment
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">Request a Pickup</h2>
          <p className="text-lg text-gray-600">
            Fill out the form below to request medical courier service. We'll review and provide a quote shortly.
          </p>
        </div>

        {error && (
          <div className="glass p-4 rounded-lg border-l-4 border-red-500 mb-6">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Shipper Information */}
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="ABC Medical Center"
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                >
                  <option value="">Select type...</option>
                  <option value="INDEPENDENT_PHARMACY">Independent Pharmacy</option>
                  <option value="CLINIC">Clinic</option>
                  <option value="LAB">Laboratory</option>
                  <option value="DIALYSIS_CENTER">Dialysis Center</option>
                  <option value="IMAGING_CENTER">Imaging Center</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="GOVERNMENT">Government Facility</option>
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="John Smith"
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="(555) 123-4567"
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="contact@example.com"
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

          {/* Pickup Information */}
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
                  placeholder="Main Clinic Location"
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
                >
                  <option value="">Select type...</option>
                  <option value="CLINIC">Clinic</option>
                  <option value="LAB">Laboratory</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="DIALYSIS">Dialysis Center</option>
                  <option value="IMAGING">Imaging Center</option>
                  <option value="GOVERNMENT">Government Facility</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="pickupAddressLine1" className="block text-sm font-semibold text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  id="pickupAddressLine1"
                  name="pickupAddressLine1"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="123 Main St"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="pickupAddressLine2" className="block text-sm font-semibold text-gray-700 mb-2">
                  Suite/Unit (Optional)
                </label>
                <input
                  type="text"
                  id="pickupAddressLine2"
                  name="pickupAddressLine2"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="Suite 200"
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
                  placeholder="Los Angeles"
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
                  placeholder="CA"
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
                  placeholder="90001"
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
                  placeholder="Jane Doe"
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
                  placeholder="(555) 987-6543"
                />
              </div>

              <div>
                <label htmlFor="readyTime" className="block text-sm font-semibold text-gray-700 mb-2">
                  Ready for Pickup At
                </label>
                <input
                  type="datetime-local"
                  id="readyTime"
                  name="readyTime"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="pickupAccessNotes" className="block text-sm font-semibold text-gray-700 mb-2">
                  Access Notes / Instructions
                </label>
                <textarea
                  id="pickupAccessNotes"
                  name="pickupAccessNotes"
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="e.g., Use rear entrance, ring bell for loading dock"
                />
              </div>
            </div>
          </div>

          {/* Dropoff Information */}
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
                  placeholder="Central Lab"
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
                >
                  <option value="">Select type...</option>
                  <option value="CLINIC">Clinic</option>
                  <option value="LAB">Laboratory</option>
                  <option value="HOSPITAL">Hospital</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="DIALYSIS">Dialysis Center</option>
                  <option value="IMAGING">Imaging Center</option>
                  <option value="GOVERNMENT">Government Facility</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="dropoffAddressLine1" className="block text-sm font-semibold text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  id="dropoffAddressLine1"
                  name="dropoffAddressLine1"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="456 Lab Ave"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="dropoffAddressLine2" className="block text-sm font-semibold text-gray-700 mb-2">
                  Suite/Unit (Optional)
                </label>
                <input
                  type="text"
                  id="dropoffAddressLine2"
                  name="dropoffAddressLine2"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="Building B"
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
                  placeholder="Santa Monica"
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
                  placeholder="CA"
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
                  placeholder="90401"
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
                  placeholder="Lab Manager"
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
                  placeholder="(555) 111-2222"
                />
              </div>

              <div>
                <label htmlFor="deliveryDeadline" className="block text-sm font-semibold text-gray-700 mb-2">
                  Must Deliver By
                </label>
                <input
                  type="datetime-local"
                  id="deliveryDeadline"
                  name="deliveryDeadline"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="dropoffAccessNotes" className="block text-sm font-semibold text-gray-700 mb-2">
                  Access Notes / Instructions
                </label>
                <textarea
                  id="dropoffAccessNotes"
                  name="dropoffAccessNotes"
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="e.g., Deliver to receiving department on 2nd floor"
                />
              </div>
            </div>
          </div>

          {/* Load Details */}
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
                  <option value="STAT">STAT (Immediate)</option>
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
                  <option value="UN3373_CATEGORY_B">UN3373 - Biological Substance (Category B)</option>
                  <option value="NON_SPECIMEN_MEDICAL">Medical Supplies / Equipment</option>
                  <option value="PHARMACEUTICAL_NON_CONTROLLED">Pharmaceuticals (Non-Controlled)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="commodityDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                  What are you shipping? *
                </label>
                <textarea
                  id="commodityDescription"
                  name="commodityDescription"
                  required
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="e.g., Laboratory blood specimens for testing, Prescription medications, Medical equipment, etc."
                />
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
                  <option value="AMBIENT">Ambient (Room Temperature)</option>
                  <option value="REFRIGERATED">Refrigerated (2-8°C)</option>
                  <option value="FROZEN">Frozen (Below 0°C)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="estimatedContainers" className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Containers (Optional)
                </label>
                <input
                  type="number"
                  id="estimatedContainers"
                  name="estimatedContainers"
                  min="1"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                  placeholder="5"
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
              href="/"
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
      </main>
    </div>
  )
}
