// Rate Display Component
// Shows calculated rate with optional breakdown

import React, { useState } from 'react'

interface RateDisplayProps {
  min: number
  max: number
  breakdown?: {
    baseRate: number
    distanceRate: number
    serviceMultiplier: number
    total: number
  }
  className?: string
}

export default function RateDisplay({
  min,
  max,
  breakdown,
  className = '',
}: RateDisplayProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2">
        <div className="text-lg font-bold text-gray-900">
          ${min.toFixed(2)} - ${max.toFixed(2)}
        </div>
        {breakdown && (
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showBreakdown ? 'Hide' : 'Show'} Breakdown
          </button>
        )}
      </div>

      {showBreakdown && breakdown && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Base Rate:</span>
            <span className="font-medium">${breakdown.baseRate.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Distance Rate:</span>
            <span className="font-medium">${breakdown.distanceRate.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Service Multiplier:</span>
            <span className="font-medium">{breakdown.serviceMultiplier}x</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-200">
            <span className="font-semibold text-gray-900">Total:</span>
            <span className="font-bold text-gray-900">
              ${breakdown.total.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

