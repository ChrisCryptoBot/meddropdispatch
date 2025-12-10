'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { LOAD_STATUS_LABELS, LOAD_STATUS_COLORS, TRACKING_EVENT_LABELS } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import type { LoadStatus, TrackingEventCode } from '@prisma/client'

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

  // Load data
  useEffect(() => {
    if (params.id) {
      fetchLoad()
    }
  }, [params.id])

  const fetchLoad = async () => {
    try {
      const response = await fetch(`/api/load-requests/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch load')
      const data = await response.json()
      setLoad(data)
      setQuoteAmount(data.quoteAmount?.toString() || '')
      setQuoteNotes(data.quoteNotes || '')
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setIsLoading(false)
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
      alert('Quote submitted successfully!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit quote')
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
      alert('Status updated successfully!')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading load details...</p>
        </div>
      </div>
    )
  }

  if (error || !load) {
    return (
      <div className="p-8">
        <div className="glass p-8 rounded-2xl text-center">
          <p className="text-red-600 mb-4">{error || 'Load not found'}</p>
          <Link href="/admin/loads" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Back to Loads
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/loads" className="text-primary-600 hover:text-primary-700 font-medium mb-4 inline-block">
          ← Back to Loads
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{load.publicTrackingCode}</h1>
            <p className="text-gray-600">Manage load request and tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-lg font-semibold ${LOAD_STATUS_COLORS[load.status]}`}>
              {LOAD_STATUS_LABELS[load.status]}
            </span>
            <Link
              href={`/track/${load.publicTrackingCode}`}
              target="_blank"
              className="px-4 py-2 rounded-lg bg-white/60 hover:bg-white/80 border border-gray-300 font-medium transition-base"
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
          <div className="glass p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Shipper & Locations</h2>

            {/* Shipper */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-3">Shipper Information</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Company</p>
                  <p className="font-semibold text-gray-800">{load.shipper.companyName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Type</p>
                  <p className="font-semibold text-gray-800">{load.shipper.clientType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-gray-600">Contact</p>
                  <p className="font-semibold text-gray-800">{load.shipper.contactName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-800">{load.shipper.phone}</p>
                </div>
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-semibold text-gray-800">{load.shipper.email}</p>
                </div>
                <div>
                  <p className="text-gray-600">Preferred Contact</p>
                  <p className="font-semibold text-gray-800">{load.preferredContactMethod}</p>
                </div>
              </div>
            </div>

            {/* Pickup */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                </svg>
                Pickup Location
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="md:col-span-2">
                  <p className="font-semibold text-gray-800">{load.pickupFacility.name}</p>
                  <p className="text-gray-600">{load.pickupFacility.addressLine1}</p>
                  {load.pickupFacility.addressLine2 && <p className="text-gray-600">{load.pickupFacility.addressLine2}</p>}
                  <p className="text-gray-600">
                    {load.pickupFacility.city}, {load.pickupFacility.state} {load.pickupFacility.postalCode}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Contact</p>
                  <p className="font-semibold text-gray-800">{load.pickupFacility.contactName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-800">{load.pickupFacility.contactPhone}</p>
                </div>
                {load.readyTime && (
                  <div className="md:col-span-2">
                    <p className="text-gray-600">Ready Time</p>
                    <p className="font-semibold text-gray-800">{formatDateTime(load.readyTime)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dropoff */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
                </svg>
                Delivery Location
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="md:col-span-2">
                  <p className="font-semibold text-gray-800">{load.dropoffFacility.name}</p>
                  <p className="text-gray-600">{load.dropoffFacility.addressLine1}</p>
                  {load.dropoffFacility.addressLine2 && <p className="text-gray-600">{load.dropoffFacility.addressLine2}</p>}
                  <p className="text-gray-600">
                    {load.dropoffFacility.city}, {load.dropoffFacility.state} {load.dropoffFacility.postalCode}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Contact</p>
                  <p className="font-semibold text-gray-800">{load.dropoffFacility.contactName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-800">{load.dropoffFacility.contactPhone}</p>
                </div>
                {load.deliveryDeadline && (
                  <div className="md:col-span-2">
                    <p className="text-gray-600">Delivery Deadline</p>
                    <p className="font-semibold text-gray-800">{formatDateTime(load.deliveryDeadline)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Load Details */}
          <div className="glass p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Shipment Details</h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Service Type</p>
                <p className="font-semibold text-gray-800">{load.serviceType.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Specimen Category</p>
                <p className="font-semibold text-gray-800">{load.specimenCategory.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Temperature Requirement</p>
                <p className="font-semibold text-gray-800">{load.temperatureRequirement}</p>
              </div>
              {load.estimatedContainers && (
                <div>
                  <p className="text-gray-600 mb-1">Estimated Containers</p>
                  <p className="font-semibold text-gray-800">{load.estimatedContainers}</p>
                </div>
              )}
              {load.estimatedWeightKg && (
                <div>
                  <p className="text-gray-600 mb-1">Estimated Weight</p>
                  <p className="font-semibold text-gray-800">{load.estimatedWeightKg} kg</p>
                </div>
              )}
              {load.declaredValue && (
                <div>
                  <p className="text-gray-600 mb-1">Declared Value</p>
                  <p className="font-semibold text-gray-800">${load.declaredValue.toFixed(2)}</p>
                </div>
              )}
              <div className="md:col-span-2">
                <p className="text-gray-600 mb-1">Commodity Description</p>
                <p className="font-semibold text-gray-800">{load.commodityDescription}</p>
              </div>
              {load.accessNotes && (
                <div className="md:col-span-2">
                  <p className="text-gray-600 mb-1">Additional Instructions</p>
                  <p className="font-semibold text-gray-800">{load.accessNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tracking Events */}
          <div className="glass p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Tracking Events</h2>
            {load.trackingEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tracking events yet</p>
            ) : (
              <div className="space-y-4">
                {load.trackingEvents.map((event: any) => (
                  <div key={event.id} className="flex items-start gap-4 p-4 bg-white/40 rounded-xl border border-gray-200">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <p className="font-semibold text-gray-800">{event.label}</p>
                        <span className="text-sm text-gray-500 whitespace-nowrap">{formatDateTime(event.createdAt)}</span>
                      </div>
                      {event.locationText && <p className="text-sm text-gray-600">📍 {event.locationText}</p>}
                      {event.description && <p className="text-sm text-gray-600 mt-1">{event.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Right 1/3 */}
        <div className="space-y-8">
          {/* Quote Management */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Quote & Pricing</h3>
            <form onSubmit={handleQuoteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Quote Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Quote Notes</label>
                <textarea
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                  placeholder="Internal notes about pricing..."
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingQuote || !quoteAmount}
                className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-base"
              >
                {isSubmittingQuote ? 'Submitting...' : 'Submit Quote'}
              </button>
            </form>
          </div>

          {/* Status Update */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Update Status</h3>
            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">New Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as LoadStatus)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                  required
                >
                  <option value="">Select status...</option>
                  <option value="QUOTE_ACCEPTED">Quote Accepted</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PICKED_UP">Picked Up</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Event Label</label>
                <input
                  type="text"
                  value={eventLabel}
                  onChange={(e) => setEventLabel(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
                  placeholder="City, State"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/60"
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

          {/* Documents */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Documents</h3>
            {load.documents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No documents yet</p>
            ) : (
              <div className="space-y-2">
                {load.documents.map((doc: any) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 bg-white/40 rounded-lg hover:bg-white/60 border border-gray-200 transition-base"
                  >
                    <p className="text-sm font-semibold text-gray-800 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500">{doc.type.replace(/_/g, ' ')}</p>
                  </a>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-4 text-center">
              Document upload coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
