// Quote Request Card Component
// Displays a quote request with quick actions

import React from 'react'
import Link from 'next/link'
import CallButton from './CallButton'
import RateDisplay from './RateDisplay'
import EmailSourceBadge from './EmailSourceBadge'

interface QuoteRequest {
  id: string
  publicTrackingCode: string
  shipper: {
    id: string
    companyName: string
    email: string
    phone: string
  }
  pickupFacility: {
    city: string
    state: string
  }
  dropoffFacility: {
    city: string
    state: string
  }
  serviceType: string
  autoCalculatedDistance?: number
  suggestedRateMin?: number
  suggestedRateMax?: number
  createdAt: string
}

interface QuoteRequestCardProps {
  request: QuoteRequest
  onCalculateRate?: (requestId: string) => void
  onConvertToLoad?: (requestId: string) => void
}

export default function QuoteRequestCard({
  request,
  onCalculateRate,
  onConvertToLoad,
}: QuoteRequestCardProps) {
  const route = `${request.pickupFacility.city}, ${request.pickupFacility.state} → ${request.dropoffFacility.city}, ${request.dropoffFacility.state}`

  const handleCalculateRate = () => {
    if (onCalculateRate) {
      onCalculateRate(request.id)
    }
  }

  const handleConvertToLoad = () => {
    if (onConvertToLoad) {
      onConvertToLoad(request.id)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/admin/loads/${request.id}`}
              className="text-lg font-bold text-gray-900 hover:text-blue-600"
            >
              {request.publicTrackingCode}
            </Link>
            <EmailSourceBadge />
          </div>
          <p className="text-sm font-semibold text-gray-700">{request.shipper.companyName}</p>
          <p className="text-xs text-gray-500">{request.shipper.email}</p>
        </div>
        <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
          {request.serviceType}
        </span>
      </div>

      {/* Route Info */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">Route:</p>
        <p className="text-sm font-medium text-gray-900">{route}</p>
        {request.autoCalculatedDistance && (
          <p className="text-xs text-gray-500 mt-1">
            {request.autoCalculatedDistance} miles
          </p>
        )}
      </div>

      {/* Rate Display */}
      {request.suggestedRateMin && request.suggestedRateMax && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 mb-1">Suggested Rate:</p>
          <RateDisplay
            min={request.suggestedRateMin}
            max={request.suggestedRateMax}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
        <CallButton
          phoneNumber={request.shipper.phone}
          label="Call"
          className="flex-1"
        />
        {!request.suggestedRateMin && (
          <button
            onClick={handleCalculateRate}
            className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            Calculate Rate
          </button>
        )}
        {request.suggestedRateMin && (
          <button
            onClick={handleConvertToLoad}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Convert to Load
          </button>
        )}
        <Link
          href={`/admin/loads/${request.id}`}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          View Details
        </Link>
      </div>

      {/* Timestamp */}
      <p className="text-xs text-gray-400 mt-3">
        {new Date(request.createdAt).toLocaleString()}
      </p>
    </div>
  )
}


