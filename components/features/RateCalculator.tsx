'use client'

import { useState } from 'react'
import { getCurrentLocation } from '@/lib/gps'
import { showToast, showApiError } from '@/lib/toast'
import AddressAutocomplete from './AddressAutocomplete'

interface RateCalculatorProps {
  loadId?: string
  pickupAddress: string
  dropoffAddress: string
  serviceType: string
  onCalculate?: (calculation: any) => void
  showDeadhead?: boolean
  className?: string
  isManualLoad?: boolean
  onQuoteSet?: (quoteAmount: number) => void // Callback when quoted rate is set
}

export default function RateCalculator({
  loadId,
  pickupAddress,
  dropoffAddress,
  serviceType,
  onCalculate,
  showDeadhead = true,
  className = '',
  isManualLoad = false,
  onQuoteSet,
}: RateCalculatorProps) {
  const [driverStartingLocation, setDriverStartingLocation] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculation, setCalculation] = useState<any>(null)
  const [quotedRate, setQuotedRate] = useState<string>('')
  const [isSavingQuote, setIsSavingQuote] = useState(false)
  const [quoteSaved, setQuoteSaved] = useState(false)

  const handleUseCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation()
      if (location) {
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
        setDriverStartingLocation(`${location.latitude}, ${location.longitude}`)
        showToast.success('Current location captured (coordinates)')
      }
    } catch (error) {
      showToast.error('Could not get current location. Please enter manually.')
    }
  }

  const handleCalculate = async () => {
    // Clean and validate addresses
    const cleanPickup = pickupAddress?.trim().replace(/^,+|,+$/g, '').trim() || ''
    const cleanDropoff = dropoffAddress?.trim().replace(/^,+|,+$/g, '').trim() || ''

    if (!cleanPickup || !cleanDropoff) {
      showToast.error('Pickup and dropoff addresses are required')
      return
    }

    // Check if addresses look complete (at least 10 characters)
    if (cleanPickup.length < 10 || cleanDropoff.length < 10) {
      showToast.error('Please provide complete addresses with street, city, and state for accurate calculation')
      return
    }

    setIsCalculating(true)
    try {
      // Get driver ID from localStorage if available
      let driverId: string | undefined
      try {
        const driverData = localStorage.getItem('driver')
        if (driverData) {
          const driver = JSON.parse(driverData)
          driverId = driver.id
        }
      } catch (e) {
        // Ignore if driver not logged in
      }

      let endpoint = '/api/load-requests/calculate-rate-simple'
      let body: any = {
        pickupAddress: cleanPickup,
        dropoffAddress: cleanDropoff,
        serviceType,
        driverId,
        isManualLoad: isManualLoad, // Use prop value
      }

      // If deadhead is enabled and location provided, include it
      if (showDeadhead && driverStartingLocation) {
        body.driverStartingLocation = driverStartingLocation
      }

      // If loadId exists and we have deadhead, use the load-specific endpoint
      if (loadId && showDeadhead && driverStartingLocation) {
        endpoint = `/api/load-requests/${loadId}/calculate-rate-with-deadhead`
        body = { driverStartingLocation, driverId }
      } else if (loadId && !showDeadhead) {
        endpoint = `/api/load-requests/${loadId}/calculate-rate`
        body = { driverId }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to calculate rate')
      }

      const data = await response.json()
      setCalculation(data.calculation || data)
      if (onCalculate) {
        onCalculate(data.calculation || data)
      }
      showToast.success('Rate calculated successfully!')
    } catch (error) {
      showApiError(error, 'Failed to calculate rate')
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showDeadhead && (
        <div>
          <label htmlFor="driverStartingLocation" className="block text-sm font-semibold text-gray-700 mb-2">
            Your Current Location (Deadhead Starting Point)
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <AddressAutocomplete
                id="driverStartingLocation"
                value={driverStartingLocation}
                onChange={setDriverStartingLocation}
                placeholder="Enter address or use current location"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60 backdrop-blur-sm text-sm"
              />
            </div>
            <button
              onClick={handleUseCurrentLocation}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
              title="Use GPS location"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              GPS
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Optional: Enter your location to include deadhead miles in rate calculation
          </p>
        </div>
      )}

      <button
        onClick={handleCalculate}
        disabled={isCalculating || (showDeadhead && !driverStartingLocation && loadId)}
        className="w-full px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
      >
        {isCalculating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Calculating...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Calculate Rate
          </>
        )}
      </button>

      {calculation && (
        <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Rate Calculation</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {calculation.deadheadDistance !== undefined && (
              <>
                <div>
                  <p className="text-gray-600 mb-1">Deadhead</p>
                  <p className="font-bold text-gray-900">{calculation.deadheadDistance.toFixed(1)} mi</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Load Distance</p>
                  <p className="font-bold text-gray-900">{calculation.loadDistance?.toFixed(1) || calculation.distance?.toFixed(1) || '0.0'} mi</p>
                </div>
              </>
            )}
            <div>
              <p className="text-gray-600 mb-1">Total Distance</p>
              <p className="font-bold text-primary-700">
                {calculation.totalDistance?.toFixed(1) || calculation.distance?.toFixed(1) || '0.0'} mi
              </p>
            </div>
            {calculation.ratePerMile && (
              <div>
                <p className="text-gray-600 mb-1">Rate Per Mile</p>
                <p className="font-bold text-primary-700">${calculation.ratePerMile.toFixed(2)}/mi</p>
              </div>
            )}
          </div>
          
          {/* Minimum Rate Warning */}
          {calculation.driverMinimumRatePerMile && calculation.rateAdjustedForMinimum && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Rate adjusted to meet your minimum: ${calculation.driverMinimumRatePerMile.toFixed(2)}/mi</span>
              </div>
            </div>
          )}

          {/* Suggested Rate Range */}
          {calculation.suggestedRateMin && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-gray-600 mb-1">Suggested Rate Range</p>
              <p className="text-lg font-bold text-primary-700">
                ${calculation.suggestedRateMin.toFixed(2)} - ${calculation.suggestedRateMax.toFixed(2)}
              </p>
            </div>
          )}

          {/* Profit Estimate */}
          {calculation.profitEstimate && (
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                {calculation.profitEstimate.isPostBid ? 'Post-Bid Profit Estimate' : 'Pre-Bid Profit Estimate'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-600 mb-1">Estimated Costs</p>
                  <p className="font-bold text-gray-900">${calculation.profitEstimate.estimatedCosts.total.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Fuel: ${calculation.profitEstimate.estimatedCosts.fuel.toFixed(2)} • 
                    Time: ${calculation.profitEstimate.estimatedCosts.driverTime.toFixed(2)} • 
                    Overhead: ${calculation.profitEstimate.estimatedCosts.overhead.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Estimated Profit</p>
                  <p className={`font-bold ${calculation.profitEstimate.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    ${calculation.profitEstimate.profit.toFixed(2)}
                  </p>
                  <p className={`text-xs mt-0.5 ${calculation.profitEstimate.profitMargin >= 20 ? 'text-green-700' : calculation.profitEstimate.profitMargin >= 10 ? 'text-yellow-700' : 'text-red-700'}`}>
                    {calculation.profitEstimate.profitMargin >= 0 ? '+' : ''}{calculation.profitEstimate.profitMargin.toFixed(1)}% margin
                  </p>
                </div>
              </div>
              {!calculation.profitEstimate.meetsMinimumRate && calculation.profitEstimate.minimumRateRequired > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <p className="font-semibold">⚠️ Below Minimum Rate</p>
                  <p>Minimum required: ${calculation.profitEstimate.minimumRateRequired.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}

          {/* Set Quoted Rate Section - After Negotiation */}
          {loadId && calculation && (
            <div className="mt-4 pt-4 border-t-2 border-slate-300 space-y-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Set Final Quoted Rate (After Negotiation)
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Enter the final agreed-upon rate. This will be included in the confirmation email to the shipper.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={quotedRate}
                    onChange={(e) => {
                      setQuotedRate(e.target.value)
                      setQuoteSaved(false)
                    }}
                    placeholder={calculation.breakdown?.total?.toFixed(2) || '0.00'}
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white text-sm"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!quotedRate || parseFloat(quotedRate) <= 0) {
                      showToast.error('Please enter a valid quoted rate')
                      return
                    }

                    if (!loadId) {
                      showToast.error('Load ID is required to save quoted rate')
                      return
                    }

                    setIsSavingQuote(true)
                    try {
                      const response = await fetch(`/api/load-requests/${loadId}/set-quote`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ quoteAmount: parseFloat(quotedRate) }),
                      })

                      if (!response.ok) {
                        const errorData = await response.json()
                        throw new Error(errorData.error || 'Failed to save quoted rate')
                      }

                      setQuoteSaved(true)
                      showToast.success('Quoted rate saved! It will be included in the confirmation email.')
                      if (onQuoteSet) {
                        onQuoteSet(parseFloat(quotedRate))
                      }
                    } catch (error) {
                      showApiError(error, 'Failed to save quoted rate')
                    } finally {
                      setIsSavingQuote(false)
                    }
                  }}
                  disabled={isSavingQuote || !quotedRate || parseFloat(quotedRate) <= 0 || quoteSaved}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  {isSavingQuote ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : quoteSaved ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Saved
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Set Quote
                    </>
                  )}
                </button>
              </div>
              {quoteSaved && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                  <p className="font-semibold">✓ Quoted rate saved</p>
                  <p>This rate will be included in the confirmation email sent to the shipper.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

