'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ShipperAutocomplete from '@/components/features/ShipperAutocomplete'
import LocationForm, { LocationData } from '@/components/features/LocationForm'

export default function RequestLoadPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [companyName, setCompanyName] = useState('')
  const [selectedShipper, setSelectedShipper] = useState<{
    id: string
    companyName: string
    email: string
    contactName: string
    phone: string
    clientType: string
  } | null>(null)
  
  // Multiple locations support
  const [pickupLocations, setPickupLocations] = useState<LocationData[]>([
    {
      facilityName: '',
      facilityType: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      contactName: '',
      contactPhone: '',
      accessNotes: '',
      readyTime: '',
    },
  ])
  
  const [dropoffLocations, setDropoffLocations] = useState<LocationData[]>([
    {
      facilityName: '',
      facilityType: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      contactName: '',
      contactPhone: '',
      accessNotes: '',
      readyTime: '',
    },
  ])
  
  const addPickupLocation = () => {
    setPickupLocations([
      ...pickupLocations,
      {
        facilityName: '',
        facilityType: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        contactName: '',
        contactPhone: '',
        accessNotes: '',
        readyTime: '',
      },
    ])
  }
  
  const addDropoffLocation = () => {
    setDropoffLocations([
      ...dropoffLocations,
      {
        facilityName: '',
        facilityType: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        contactName: '',
        contactPhone: '',
        accessNotes: '',
        readyTime: '',
      },
    ])
  }
  
  const updatePickupLocation = (index: number, data: LocationData) => {
    const updated = [...pickupLocations]
    updated[index] = data
    setPickupLocations(updated)
  }
  
  const updateDropoffLocation = (index: number, data: LocationData) => {
    const updated = [...dropoffLocations]
    updated[index] = data
    setDropoffLocations(updated)
  }
  
  const removePickupLocation = (index: number) => {
    if (pickupLocations.length > 1) {
      setPickupLocations(pickupLocations.filter((_, i) => i !== index))
    }
  }
  
  const removeDropoffLocation = (index: number) => {
    if (dropoffLocations.length > 1) {
      setDropoffLocations(dropoffLocations.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const baseData = Object.fromEntries(formData.entries())
    
    // Use first pickup/dropoff for backward compatibility
    const firstPickup = pickupLocations[0]
    const firstDropoff = dropoffLocations[0]
    
    // Build data object with first location for backward compatibility
    const data = {
      ...baseData,
      // First pickup location (backward compatibility)
      pickupFacilityName: firstPickup.facilityName,
      pickupFacilityType: firstPickup.facilityType,
      pickupAddressLine1: firstPickup.addressLine1,
      pickupAddressLine2: firstPickup.addressLine2,
      pickupCity: firstPickup.city,
      pickupState: firstPickup.state,
      pickupPostalCode: firstPickup.postalCode,
      pickupContactName: firstPickup.contactName,
      pickupContactPhone: firstPickup.contactPhone,
      pickupAccessNotes: firstPickup.accessNotes,
      readyTime: firstPickup.readyTime,
      // First dropoff location (backward compatibility)
      dropoffFacilityName: firstDropoff.facilityName,
      dropoffFacilityType: firstDropoff.facilityType,
      dropoffAddressLine1: firstDropoff.addressLine1,
      dropoffAddressLine2: firstDropoff.addressLine2,
      dropoffCity: firstDropoff.city,
      dropoffState: firstDropoff.state,
      dropoffPostalCode: firstDropoff.postalCode,
      dropoffContactName: firstDropoff.contactName,
      dropoffContactPhone: firstDropoff.contactPhone,
      dropoffAccessNotes: firstDropoff.accessNotes,
      deliveryDeadline: firstDropoff.readyTime,
      // Multiple locations
      locations: [
        ...pickupLocations.map((loc, idx) => ({
          ...loc,
          locationType: 'PICKUP' as const,
          sequence: idx + 1,
        })),
        ...dropoffLocations.map((loc, idx) => ({
          ...loc,
          locationType: 'DROPOFF' as const,
          sequence: idx + 1,
        })),
      ],
    }

    try {
      const response = await fetch('/api/load-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle field-specific errors
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorsMap: Record<string, string> = {}
          errorData.errors.forEach((err: any) => {
            if (err.field && err.message) {
              errorsMap[err.field] = err.message
            }
          })
          setFieldErrors(errorsMap)
        }
        
        setError(errorData.message || errorData.error || 'Failed to submit request')
        setIsSubmitting(false)
        return
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
      <header className="glass-primary sticky top-0 z-50 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">MED DROP</h1>
                <p className="text-xs text-slate-400">Medical Courier Services</p>
              </div>
            </Link>
            <Link
              href="/track"
              className="text-slate-300 hover:text-cyan-400 transition-colors font-medium"
            >
              Track Shipment
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-3">Request a Pickup</h2>
          <p className="text-lg text-slate-400">
            Fill out the form below to request medical courier service. We'll review and provide a quote shortly.
          </p>
        </div>

        {error && (
          <div className="glass-primary p-4 rounded-lg border-l-4 border-red-500/50 mb-6 bg-red-500/10">
            <p className="text-red-400 font-medium mb-2">{error}</p>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-sm text-red-300">
                {Object.entries(fieldErrors).map(([field, message]) => (
                  <li key={field}>
                    <strong className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</strong> {message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form id="loadRequestForm" onSubmit={handleSubmit} className="space-y-8">
          {/* Shipper Information */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50">
            <h3 className="text-2xl font-bold text-white mb-6">Company Information</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="companyName" className="block text-sm font-semibold text-slate-300 mb-2">
                  Company Name *
                </label>
                <ShipperAutocomplete
                  id="companyName"
                  name="companyName"
                  value={companyName}
                  onChange={(value) => {
                    setCompanyName(value)
                    // Clear selected shipper if user is typing a new name
                    if (!value || value !== selectedShipper?.companyName) {
                      setSelectedShipper(null)
                    }
                  }}
                  onShipperSelect={(shipper) => {
                    setSelectedShipper(shipper)
                    setCompanyName(shipper.companyName)
                    // Auto-populate other fields if shipper is selected
                    const form = document.getElementById('loadRequestForm') as HTMLFormElement
                    if (form) {
                      const emailInput = form.querySelector('[name="email"]') as HTMLInputElement
                      const contactNameInput = form.querySelector('[name="contactName"]') as HTMLInputElement
                      const phoneInput = form.querySelector('[name="phone"]') as HTMLInputElement
                      const clientTypeSelect = form.querySelector('[name="clientType"]') as HTMLSelectElement
                      
                      if (emailInput) emailInput.value = shipper.email
                      if (contactNameInput) contactNameInput.value = shipper.contactName
                      if (phoneInput) phoneInput.value = shipper.phone
                      if (clientTypeSelect) clientTypeSelect.value = shipper.clientType
                    }
                  }}
                  placeholder="Type company name to search or enter new..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  required
                />
                {selectedShipper && (
                  <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Found existing shipper - fields auto-populated
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="clientType" className="block text-sm font-semibold text-slate-300 mb-2">
                  Facility Type *
                </label>
                <select
                  id="clientType"
                  name="clientType"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
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
                <label htmlFor="contactName" className="block text-sm font-semibold text-slate-300 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-slate-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="contact@example.com"
                />
              </div>

              <div>
                <label htmlFor="preferredContactMethod" className="block text-sm font-semibold text-slate-300 mb-2">
                  Preferred Contact Method *
                </label>
                <select
                  id="preferredContactMethod"
                  name="preferredContactMethod"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                >
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pickup Information */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Pickup Locations</h3>
              <button
                type="button"
                onClick={addPickupLocation}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:shadow-xl hover:shadow-cyan-500/50 transition-all text-sm font-semibold shadow-lg shadow-cyan-500/30"
              >
                + Add Pickup Location
              </button>
            </div>
            <div className="space-y-4">
              {pickupLocations.map((location, index) => (
                <LocationForm
                  key={`pickup-${index}`}
                  locationType="PICKUP"
                  index={index}
                  location={location}
                  onChange={updatePickupLocation}
                  onRemove={removePickupLocation}
                  canRemove={pickupLocations.length > 1}
                />
              ))}
            </div>
          </div>

          {/* Dropoff Information */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Delivery Locations</h3>
              <button
                type="button"
                onClick={addDropoffLocation}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:shadow-xl hover:shadow-cyan-500/50 transition-all text-sm font-semibold shadow-lg shadow-cyan-500/30"
              >
                + Add Delivery Location
              </button>
            </div>
            <div className="space-y-4">
              {dropoffLocations.map((location, index) => (
                <LocationForm
                  key={`dropoff-${index}`}
                  locationType="DROPOFF"
                  index={index}
                  location={location}
                  onChange={updateDropoffLocation}
                  onRemove={removeDropoffLocation}
                  canRemove={dropoffLocations.length > 1}
                />
              ))}
            </div>
          </div>

          {/* Load Details */}
          <div className="glass-primary p-8 rounded-xl border border-slate-700/50">
            <h3 className="text-2xl font-bold text-white mb-6">Shipment Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="serviceType" className="block text-sm font-semibold text-slate-300 mb-2">
                  Service Type *
                </label>
                <select
                  id="serviceType"
                  name="serviceType"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
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
                <label htmlFor="specimenCategory" className="block text-sm font-semibold text-slate-300 mb-2">
                  Specimen Category *
                </label>
                <select
                  id="specimenCategory"
                  name="specimenCategory"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                >
                  <option value="">Select category...</option>
                  <option value="UN3373_CATEGORY_B">UN3373 - Biological Substance (Category B)</option>
                  <option value="NON_SPECIMEN_MEDICAL">Medical Supplies / Equipment</option>
                  <option value="PHARMACEUTICAL_NON_CONTROLLED">Pharmaceuticals (Non-Controlled)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="commodityDescription" className="block text-sm font-semibold text-slate-300 mb-2">
                  What are you shipping? *
                </label>
                <textarea
                  id="commodityDescription"
                  name="commodityDescription"
                  required
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="e.g., Laboratory blood specimens for testing, Prescription medications, Medical equipment, etc."
                />
              </div>

              <div>
                <label htmlFor="temperatureRequirement" className="block text-sm font-semibold text-slate-300 mb-2">
                  Temperature Requirement *
                </label>
                <select
                  id="temperatureRequirement"
                  name="temperatureRequirement"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                >
                  <option value="">Select requirement...</option>
                  <option value="AMBIENT">Ambient (Room Temperature)</option>
                  <option value="REFRIGERATED">Refrigerated (2-8°C)</option>
                  <option value="FROZEN">Frozen (Below 0°C)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="estimatedContainers" className="block text-sm font-semibold text-slate-300 mb-2">
                  Number of Containers (Optional)
                </label>
                <input
                  type="number"
                  id="estimatedContainers"
                  name="estimatedContainers"
                  min="1"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="5"
                />
              </div>

              <div>
                <label htmlFor="estimatedWeightLbs" className="block text-sm font-semibold text-slate-300 mb-2">
                  Estimated Weight (lb)
                </label>
                <input
                  type="number"
                  id="estimatedWeightLbs"
                  name="estimatedWeightLbs"
                  placeholder="e.g. 5"
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label htmlFor="declaredValue" className="block text-sm font-semibold text-slate-300 mb-2">
                  Declared Value (USD)
                </label>
                <input
                  type="number"
                  id="declaredValue"
                  name="declaredValue"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="500.00"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="accessNotes" className="block text-sm font-semibold text-slate-300 mb-2">
                  Additional Instructions
                </label>
                <textarea
                  id="accessNotes"
                  name="accessNotes"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="Any special handling requirements, delivery instructions, or other important information..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/"
              className="px-8 py-4 rounded-xl text-slate-200 hover:bg-slate-700/50 transition-colors font-semibold border border-slate-600/50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-semibold hover:shadow-xl hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/30"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

