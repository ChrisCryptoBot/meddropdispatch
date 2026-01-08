'use client'

import { useState, useEffect, useRef } from 'react'

interface ShipperAutocompleteProps {
  value: string
  onChange: (companyName: string) => void
  onShipperSelect?: (shipperData: {
    id: string
    companyName: string
    email: string
    contactName: string
    phone: string
    clientType: string
    shipperCode: string | null // Client ID
  }) => void
  placeholder?: string
  className?: string
  id?: string
  name?: string
  required?: boolean
}

interface Shipper {
  id: string
  companyName: string
  email: string
  contactName: string
  phone: string
  clientType: string
  shipperCode: string | null // Client ID
}

export default function ShipperAutocomplete({
  value,
  onChange,
  onShipperSelect,
  placeholder = 'Type company name...',
  className = '',
  id,
  name,
  required = false,
}: ShipperAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [shippers, setShippers] = useState<Shipper[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [selectedShipper, setSelectedShipper] = useState<Shipper | null>(null)
  const justSelectedRef = useRef(false)
  const selectedValueRef = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const blurTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (justSelectedRef.current) {
      return
    }
    
    if (value !== inputValue && value !== selectedValueRef.current) {
      setInputValue(value)
    }
  }, [value])

  useEffect(() => {
    if (justSelectedRef.current) {
      setShowSuggestions(false)
      setShippers([])
      return
    }

    if (selectedValueRef.current && inputValue === selectedValueRef.current) {
      setShowSuggestions(false)
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (inputValue.length < 2) {
      setShippers([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      if (justSelectedRef.current) {
        setIsLoading(false)
        setShowSuggestions(false)
        setShippers([])
        return
      }

      try {
        const response = await fetch(`/api/shippers?search=${encodeURIComponent(inputValue)}`)
        const data = await response.json()
        
        if (response.ok) {
          if (!justSelectedRef.current) {
            setShippers(data.shippers || [])
            setShowSuggestions(data.shippers && data.shippers.length > 0)
          } else {
            setShippers([])
            setShowSuggestions(false)
          }
        } else {
          if (!justSelectedRef.current) {
            setShippers([])
            setShowSuggestions(false)
          }
        }
      } catch (error) {
        console.error('Error fetching shippers:', error)
        if (!justSelectedRef.current) {
          setShippers([])
          setShowSuggestions(false)
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
    
    if (newValue !== selectedValueRef.current) {
      justSelectedRef.current = false
      selectedValueRef.current = null
      setSelectedShipper(null)
    }
    
    setInputValue(newValue)
    onChange(newValue)
    setSelectedIndex(-1)
  }

  const handleSelect = (shipper: Shipper) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    justSelectedRef.current = true
    selectedValueRef.current = shipper.companyName
    setSelectedShipper(shipper)

    setShowSuggestions(false)
    setShippers([])
    setIsLoading(false)
    
    setInputValue(shipper.companyName)
    onChange(shipper.companyName)
    
    inputRef.current?.blur()

    if (onShipperSelect) {
      onShipperSelect(shipper)
    }

    setTimeout(() => {
      justSelectedRef.current = false
      selectedValueRef.current = null
    }, 500)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || shippers.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < shippers.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < shippers.length) {
          handleSelect(shippers[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    
    if (justSelectedRef.current) {
      setShowSuggestions(false)
      return
    }
    
    const relatedTarget = e.relatedTarget as HTMLElement
    if (relatedTarget && suggestionsRef.current?.contains(relatedTarget)) {
      return
    }
    
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
          if (justSelectedRef.current) {
            return
          }
          if (shippers.length > 0) {
            setShowSuggestions(true)
          }
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      
      {showSuggestions && shippers.length > 0 && !justSelectedRef.current && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700/50 rounded-lg shadow-lg max-h-60 overflow-auto"
          onMouseDown={(e) => {
            e.preventDefault()
          }}
        >
          {shippers.map((shipper, index) => (
            <button
              key={shipper.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSelect(shipper)
              }}
              onFocus={(e) => {
                e.stopPropagation()
              }}
              className={`w-full text-left px-4 py-2 hover:bg-slate-700/50 focus:bg-slate-700/50 focus:outline-none transition-colors ${
                index === selectedIndex ? 'bg-slate-700/50' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {shipper.companyName}
                    </p>
                    {shipper.shipperCode && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 flex-shrink-0">
                        ID: {shipper.shipperCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {shipper.email} • {shipper.contactName}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isLoading && inputValue.length >= 2 && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>
        </div>
      )}
    </div>
  )
}


