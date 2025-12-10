'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LoadRequest {
  id: string
  trackingCode: string
  status: string
  pickupDate: string
  deliveryDate: string | null
  quoteAmount: number | null
  quoteNotes: string | null
  specialInstructions: string | null
  temperatureControlled: boolean
  weightLbs: number
  equipmentType: string
  pickupFacility: {
    name: string
    address: string
    city: string
    state: string
    zip: string
    contactName: string
    contactPhone: string
  }
  dropoffFacility: {
    name: string
    address: string
    city: string
    state: string
    zip: string
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

export default function ShipperLoadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [load, setLoad] = useState<LoadRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)

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
    fetchLoad()
  }, [router])

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

  const handleAcceptQuote = async () => {
    if (!confirm('Accept this quote? This will schedule the shipment.')) return

    setIsAccepting(true)
    try {
      const response = await fetch(`/api/load-requests/${params.id}/accept-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error('Failed to accept quote')

      const data = await response.json()

      // Refresh load data
      await fetchLoad()

      alert('Quote accepted successfully! Your shipment is now scheduled.')
    } catch (error) {
      console.error('Error accepting quote:', error)
      alert('Failed to accept quote. Please try again.')
    } finally {
      setIsAccepting(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'NEW': 'bg-blue-100 text-blue-800 border-blue-200',
      'QUOTED': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'QUOTE_ACCEPTED': 'bg-green-100 text-green-800 border-green-200',
      'SCHEDULED': 'bg-purple-100 text-purple-800 border-purple-200',
      'PICKED_UP': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'IN_TRANSIT': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'DELIVERED': 'bg-green-100 text-green-800 border-green-200',
      'COMPLETED': 'bg-gray-100 text-gray-800 border-gray-200',
      'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'NEW': 'New Request',
      'QUOTED': 'Quote Pending',
      'QUOTE_ACCEPTED': 'Quote Accepted',
      'SCHEDULED': 'Scheduled',
      'PICKED_UP': 'Picked Up',
      'IN_TRANSIT': 'In Transit',
      'DELIVERED': 'Delivered',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
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
    <div className="p-8">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/shipper/dashboard" className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{load.trackingCode}</h1>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(load.status)}`}>
              {getStatusLabel(load.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quote Acceptance */}
            {load.status === 'QUOTED' && load.quoteAmount && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">💰</div>
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

            {/* Quote Accepted Confirmation */}
            {load.status === 'QUOTE_ACCEPTED' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">✅</div>
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
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Route Information</h3>

              <div className="space-y-6">
                {/* Pickup */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 text-lg">📍</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">PICKUP</div>
                    <div className="font-bold text-gray-900 text-lg mb-2">{load.pickupFacility.name}</div>
                    <div className="text-gray-700 space-y-1 text-sm">
                      <p>{load.pickupFacility.address}</p>
                      <p>{load.pickupFacility.city}, {load.pickupFacility.state} {load.pickupFacility.zip}</p>
                      <p className="pt-2">
                        <span className="font-medium">Contact:</span> {load.pickupFacility.contactName}
                      </p>
                      <p>
                        <span className="font-medium">Phone:</span> {load.pickupFacility.contactPhone}
                      </p>
                      <p className="pt-2">
                        <span className="font-medium">Date:</span> {new Date(load.pickupDate).toLocaleString()}
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
                      <span className="text-blue-600 text-lg">🏁</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">DELIVERY</div>
                    <div className="font-bold text-gray-900 text-lg mb-2">{load.dropoffFacility.name}</div>
                    <div className="text-gray-700 space-y-1 text-sm">
                      <p>{load.dropoffFacility.address}</p>
                      <p>{load.dropoffFacility.city}, {load.dropoffFacility.state} {load.dropoffFacility.zip}</p>
                      <p className="pt-2">
                        <span className="font-medium">Contact:</span> {load.dropoffFacility.contactName}
                      </p>
                      <p>
                        <span className="font-medium">Phone:</span> {load.dropoffFacility.contactPhone}
                      </p>
                      {load.deliveryDate && (
                        <p className="pt-2">
                          <span className="font-medium">Date:</span> {new Date(load.deliveryDate).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Load Details */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Load Details</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Equipment Type</div>
                  <div className="font-medium text-gray-900">{load.equipmentType}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Weight</div>
                  <div className="font-medium text-gray-900">{load.weightLbs} lbs</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Temperature Control</div>
                  <div className="font-medium text-gray-900">
                    {load.temperatureControlled ? 'Required' : 'Not Required'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Created</div>
                  <div className="font-medium text-gray-900">
                    {new Date(load.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {load.specialInstructions && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Special Instructions</div>
                  <div className="text-gray-700">{load.specialInstructions}</div>
                </div>
              )}
            </div>

            {/* Tracking Timeline */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
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
                          <p className="text-sm text-gray-500 mb-1">📍 {event.locationText}</p>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Driver Information */}
            {load.driver && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
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
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Tracking Code</div>
                  <div className="font-mono font-medium text-gray-900">{load.trackingCode}</div>
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
                href={`/track/${load.trackingCode}`}
                target="_blank"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium break-all"
              >
                {typeof window !== 'undefined' && `${window.location.origin}/track/${load.trackingCode}`}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
