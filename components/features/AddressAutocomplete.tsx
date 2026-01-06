'use client'

import { useState, useEffect, useRef } from 'react'

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string) => void
  placeholder?: string
  className?: string
  id?: string
  name?: string
  required?: boolean
}

interface Prediction {
  description: string
  placeId: string
  structuredFormatting?: {
    mainText: string
    secondaryText: string
  }
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Enter address...',
  className = '',
  id,
  name,
  required = false,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const justSelectedRef = useRef(false) // Track if we just selected a prediction
  const selectedValueRef = useRef<string | null>(null) // Track the value we just selected
  const blurTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Don't sync from parent if we just selected
    if (justSelectedRef.current) {
      return
    }
    
    // Only sync if the value actually changed and it's not the value we selected
    if (value !== inputValue && value !== selectedValueRef.current) {
      setInputValue(value)
    }
  }, [value])

  useEffect(() => {
    // Don't fetch if we just selected a prediction
    if (justSelectedRef.current) {
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

    if (inputValue.length < 3) {
      setPredictions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      // Double-check we haven't selected in the meantime
      if (justSelectedRef.current) {
        setIsLoading(false)
        setShowSuggestions(false)
        setPredictions([])
        return
      }

      try {
        const response = await fetch(`/api/geocoding/autocomplete?input=${encodeURIComponent(inputValue)}`)
        if (response.ok) {
          const data = await response.json()
          // Only show suggestions if we haven't selected in the meantime
          if (!justSelectedRef.current) {
            setPredictions(data.predictions || [])
            setShowSuggestions(true)
          } else {
            setPredictions([])
            setShowSuggestions(false)
          }
        }
      } catch (error) {
        console.error('Error fetching autocomplete:', error)
        if (!justSelectedRef.current) {
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
  }, [inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    
    // If user is typing (not the selected value), clear the selection flags
    if (newValue !== selectedValueRef.current) {
      justSelectedRef.current = false
      selectedValueRef.current = null
    }
    
    setInputValue(newValue)
    onChange(newValue)
    setSelectedIndex(-1)
  }

  const handleSelect = (prediction: Prediction) => {
    // Clear any pending blur timeout and debounce
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set flags immediately to prevent any autocomplete requests
    justSelectedRef.current = true
    const selectedAddress = prediction.description
    selectedValueRef.current = selectedAddress

    // Immediately close dropdown and clear predictions
    setShowSuggestions(false)
    setPredictions([])
    setIsLoading(false)
    
    // Update input value
    setInputValue(selectedAddress)
    onChange(selectedAddress)
    
    // Blur the input to remove focus
    inputRef.current?.blur()

    // Reset flags after a delay to allow for future typing
    setTimeout(() => {
      justSelectedRef.current = false
      selectedValueRef.current = null
    }, 500)
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
    
    // If we just selected, close immediately and prevent reopening
    if (justSelectedRef.current) {
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
      if (!justSelectedRef.current) {
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
        onFocus={() => {
          // Don't show suggestions if we just selected
          if (justSelectedRef.current) {
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
      
      {showSuggestions && predictions.length > 0 && !justSelectedRef.current && (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
      
      {isLoading && inputValue.length >= 3 && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        </div>
      )}
    </div>
  )
}


