'use client'

import { useState, useEffect, useRef } from 'react'
import { getCurrentLocation } from '@/lib/gps'

interface FacilityAutocompleteProps {
  value: string
  onChange: (facilityName: string) => void
  onFacilitySelect?: (facilityData: {
    name: string
    addressLine1: string
    city: string
    state: string
    postalCode: string
    phone?: string
  }) => void
  placeholder?: string
  className?: string
  id?: string
  name?: string
  required?: boolean
  useLocation?: boolean // Whether to use driver's location for biasing results
}

interface Prediction {
  description: string
  placeId: string
  structuredFormatting?: {
    mainText: string
    secondaryText: string
  }
}

export default function FacilityAutocomplete({
  value,
  onChange,
  onFacilitySelect,
  placeholder = 'Enter facility name...',
  className = '',
  id,
  name,
  required = false,
  useLocation = true,
}: FacilityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false) // Track if we're fetching place details
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
  const justSelectedRef = useRef(false) // Use ref to prevent autocomplete after selection
  const selectedValueRef = useRef<string | null>(null) // Track the value we just selected
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const blurTimeoutRef = useRef<NodeJS.Timeout>()

  // Get driver's location on mount if useLocation is enabled
  useEffect(() => {
    if (useLocation) {
      getCurrentLocation()
        .then((location) => {
          if (location) {
            setDriverLocation({ lat: location.latitude, lng: location.longitude })
          }
        })
        .catch(() => {
          // Silently fail - location is optional
        })
    }
  }, [useLocation])

  useEffect(() => {
    // Don't sync from parent if we just selected or are fetching details
    // This prevents parent re-renders from overwriting our local state during selection
    if (justSelectedRef.current || isFetchingDetails) {
      return
    }
    
    // Only sync if the value actually changed and it's not the value we selected
    if (value !== inputValue && value !== selectedValueRef.current) {
      setInputValue(value)
    }
  }, [value]) // Only depend on value, not isFetchingDetails to avoid loops

  useEffect(() => {
    // Don't fetch if we just selected a facility or are fetching details
    if (justSelectedRef.current || isFetchingDetails) {
      // Force close dropdown if we're in selection mode
      setShowSuggestions(false)
      setPredictions([])
      return
    }

    // Don't fetch if this is the value we just selected
    if (selectedValueRef.current && inputValue === selectedValueRef.current) {
      setShowSuggestions(false)
      return
    }

    // Debounce autocomplete requests
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (inputValue.length < 2) {
      setPredictions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      // Triple-check we haven't selected or started fetching details in the meantime
      if (justSelectedRef.current || isFetchingDetails) {
        setIsLoading(false)
        setShowSuggestions(false)
        setPredictions([])
        return
      }

      try {
        let url = `/api/geocoding/facility-autocomplete?input=${encodeURIComponent(inputValue)}`
        
        // Add location bias if available
        if (driverLocation) {
          url += `&location=${driverLocation.lat},${driverLocation.lng}`
        }

        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          // Only show suggestions if we haven't selected or started fetching in the meantime
          if (!justSelectedRef.current && !isFetchingDetails) {
            setPredictions(data.predictions || [])
            setShowSuggestions(true)
          } else {
            // If we selected during fetch, clear everything
            setPredictions([])
            setShowSuggestions(false)
          }
        }
      } catch (error) {
        console.error('Error fetching facility autocomplete:', error)
        if (!justSelectedRef.current && !isFetchingDetails) {
          setPredictions([])
        }
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [inputValue, driverLocation]) // Remove isFetchingDetails from deps to prevent retrigger

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    
    // If user is typing (not the selected value), clear the selection flags
    if (newValue !== selectedValueRef.current) {
      justSelectedRef.current = false
      selectedValueRef.current = null
      setIsFetchingDetails(false) // Allow autocomplete when user types
    }
    
    setInputValue(newValue)
    onChange(newValue)
    setSelectedIndex(-1)
  }

  const handleSelect = async (prediction: Prediction) => {
    // Clear any pending blur timeout and debounce
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set flags immediately to prevent any autocomplete requests
    justSelectedRef.current = true
    setIsFetchingDetails(true) // Prevent autocomplete during details fetch
    
    const selectedName = prediction.structuredFormatting?.mainText || prediction.description
    selectedValueRef.current = selectedName

    // Immediately close dropdown and clear predictions
    setShowSuggestions(false)
    setPredictions([])
    setIsLoading(false)
    
    // Update input value
    setInputValue(selectedName)
    onChange(selectedName)
    
    // Blur the input to remove focus
    inputRef.current?.blur()

    // Fetch place details to populate address fields
    if (onFacilitySelect) {
      // Use a separate async function to handle the fetch
      const fetchDetails = async () => {
        try {
          const response = await fetch(`/api/geocoding/place-details?placeId=${encodeURIComponent(prediction.placeId)}`)
          if (response.ok) {
            const placeData = await response.json()
            // Log for debugging
            console.log('Place details received:', placeData)
            
            // Ensure we have valid data - log if missing
            if (!placeData.city || !placeData.postalCode) {
              console.warn('Missing city or postal code in place details:', {
                city: placeData.city,
                postalCode: placeData.postalCode,
                formattedAddress: placeData.formattedAddress,
                addressLine1: placeData.addressLine1,
              })
            }
            
            // Call the callback - this will trigger parent re-render
            onFacilitySelect({
              name: placeData.name || selectedName,
              addressLine1: placeData.addressLine1 || '',
              city: placeData.city || '',
              state: placeData.state || '',
              postalCode: placeData.postalCode || '',
              phone: placeData.phone || '',
            })
          } else {
            // If API call failed, log the error
            const errorData = await response.json().catch(() => ({}))
            console.error('Failed to fetch place details:', response.status, errorData)
            throw new Error('Failed to fetch place details')
          }
        } catch (error) {
          console.error('Error fetching place details:', error)
          // Still call onFacilitySelect with just the name
          onFacilitySelect({
            name: selectedName,
            addressLine1: '',
            city: '',
            state: '',
            postalCode: '',
          })
        } finally {
          // After details are fetched AND parent has had time to re-render, reset flags
          // Use a longer delay to ensure all parent state updates have settled
          setTimeout(() => {
            setIsFetchingDetails(false)
            // Keep justSelectedRef true a bit longer to prevent any late prop updates
            setTimeout(() => {
              justSelectedRef.current = false
              selectedValueRef.current = null
            }, 500)
          }, 2000) // Give enough time for all state updates to settle
        }
      }
      
      fetchDetails()
    } else {
      // If no onFacilitySelect callback, reset flags after delay
      setTimeout(() => {
        setIsFetchingDetails(false)
        setTimeout(() => {
          justSelectedRef.current = false
          selectedValueRef.current = null
        }, 500)
      }, 1000)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || predictions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          handleSelect(predictions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Clear any existing timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    
    // If we just selected, close immediately and prevent any reopening
    if (justSelectedRef.current || isFetchingDetails) {
      setShowSuggestions(false)
      return
    }
    
    // Check if focus is moving to a suggestion (relatedTarget)
    const relatedTarget = e.relatedTarget as HTMLElement
    if (relatedTarget && suggestionsRef.current?.contains(relatedTarget)) {
      // Focus is moving to a suggestion, don't close yet
      return
    }
    
    // Delay to allow click on suggestion
    blurTimeoutRef.current = setTimeout(() => {
      if (!justSelectedRef.current && !isFetchingDetails) {
        setShowSuggestions(false)
      }
    }, 200)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          // Don't show suggestions if we just selected or are fetching details
          if (justSelectedRef.current || isFetchingDetails) {
            // Prevent focus and immediately blur
            e.preventDefault()
            e.target.blur()
            setShowSuggestions(false)
            return
          }
          // Only show if we have predictions and we're not in selection mode
          if (predictions.length > 0) {
            setShowSuggestions(true)
          }
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      
      {showSuggestions && predictions.length > 0 && !justSelectedRef.current && !isFetchingDetails && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
          onMouseDown={(e) => {
            // Prevent input blur when clicking inside dropdown
            e.preventDefault()
          }}
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              type="button"
              onMouseDown={(e) => {
                // Prevent blur from firing before click
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSelect(prediction)
              }}
              onFocus={(e) => {
                // Prevent focus from bubbling up
                e.stopPropagation()
              }}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {prediction.structuredFormatting?.mainText || prediction.description}
                  </p>
                  {prediction.structuredFormatting?.secondaryText && (
                    <p className="text-xs text-gray-500 truncate">
                      {prediction.structuredFormatting.secondaryText}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isLoading && inputValue.length >= 2 && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        </div>
      )}

      {useLocation && driverLocation && (
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2" title="Using your location for nearby results">
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      )}
    </div>
  )
}

