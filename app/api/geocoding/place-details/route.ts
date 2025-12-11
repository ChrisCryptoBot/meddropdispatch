import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Initialize Google Maps client
const client = new Client({})

/**
 * GET /api/geocoding/place-details
 * Get detailed place information from Google Places API
 * Query params: placeId (the Google Place ID)
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { searchParams } = new URL(req.url)
    const placeId = searchParams.get('placeId')

    if (!placeId) {
      return NextResponse.json(
        { error: 'placeId is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      )
    }

    try {
      const response = await client.placeDetails({
        params: {
          place_id: placeId,
          key: apiKey,
          fields: ['name', 'formatted_address', 'address_components', 'geometry', 'formatted_phone_number'],
        },
        timeout: 10000,
      })

      if (response.data.status !== 'OK') {
        console.warn('Place Details API error:', response.data.status)
        return NextResponse.json(
          { error: 'Failed to fetch place details' },
          { status: 400 }
        )
      }

      const place = response.data.result

      // Parse address components
      const addressComponents = place.address_components || []
      let streetNumber = ''
      let route = ''
      let city = ''
      let state = ''
      let postalCode = ''
      let country = ''

      addressComponents.forEach((component) => {
        const types = component.types
        if (types.includes('street_number')) {
          streetNumber = component.long_name
        } else if (types.includes('route')) {
          route = component.long_name
        } else if (types.includes('locality')) {
          // Prefer locality over sublocality
          city = component.long_name
        } else if (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('sublocality_level_2')) {
          // Use sublocality as fallback if no locality
          if (!city) city = component.long_name
        } else if (types.includes('administrative_area_level_2')) {
          // Sometimes city is in level_2 (county level, but can contain city name)
          if (!city) city = component.long_name
        } else if (types.includes('administrative_area_level_1')) {
          state = component.short_name || component.long_name
        } else if (types.includes('postal_code')) {
          postalCode = component.long_name
        } else if (types.includes('postal_code_suffix')) {
          // Sometimes postal code is split
          if (!postalCode) postalCode = component.long_name
        } else if (types.includes('country')) {
          country = component.short_name
        }
      })

      // Fallback: try to extract from formatted_address if components are missing
      const formatted = place.formatted_address || ''
      if (!city || !state || !postalCode) {
        // Try multiple patterns for US addresses
        // Pattern 1: "Street, City, State ZIP, Country"
        let match = formatted.match(/([^,]+),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/)
        if (match) {
          if (!city) city = match[2].trim()
          if (!state) state = match[3]
          if (!postalCode) postalCode = match[4]
        } else {
          // Pattern 2: "City, State ZIP"
          match = formatted.match(/([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/)
          if (match) {
            if (!city) city = match[1].trim()
            if (!state) state = match[2]
            if (!postalCode) postalCode = match[3]
          } else {
            // Pattern 3: Look for ZIP code anywhere in the string
            const zipMatch = formatted.match(/\b(\d{5}(?:-\d{4})?)\b/)
            if (zipMatch && !postalCode) {
              postalCode = zipMatch[1]
            }
          }
        }
      }

      // Additional fallback: if we have formatted address but missing city, try to extract
      if (!city && formatted) {
        // Split by commas and analyze
        const parts = formatted.split(',').map(p => p.trim())
        
        // Common patterns:
        // "Street Address, City, State ZIP, Country"
        // "Street Address, City, State, Country"
        // "Street Address, City, State ZIP"
        if (parts.length >= 3) {
          // City is usually the second part (index 1), but could be after street
          // Try index 1 first
          let cityCandidate = parts[1]
          
          // If index 1 looks like a state code, try index 2
          if (cityCandidate && cityCandidate.match(/^[A-Z]{2}$/)) {
            // This is the state, city might be missing or in a different format
            // Check if there's a city-like string before the state
            const beforeState = parts.slice(0, -2).join(', ').trim()
            if (beforeState && beforeState.length > 2) {
              // Extract city from the part before state
              const beforeStateParts = beforeState.split(',').map(p => p.trim())
              cityCandidate = beforeStateParts[beforeStateParts.length - 1] || beforeState
            }
          }
          
          // Make sure it's not a state code or ZIP
          if (cityCandidate && 
              !cityCandidate.match(/^[A-Z]{2}$/) && // Not a state code
              !cityCandidate.match(/^\d{5}/) && // Not a ZIP
              !cityCandidate.match(/USA|United States/i) && // Not country
              cityCandidate.length > 2) { // Not too short
            city = cityCandidate
          }
        } else if (parts.length === 2) {
          // "City, State" or "Street, City"
          const candidate = parts[0]
          if (candidate && 
              !candidate.match(/^[A-Z]{2}$/) && 
              !candidate.match(/^\d/) && // Doesn't start with number (not a street)
              candidate.length > 2) {
            // This might be a city if the second part is a state
            if (parts[1].match(/^[A-Z]{2}/)) {
              city = candidate
            }
          }
        }
      }

      // Final fallback: extract ZIP from anywhere in formatted address
      if (!postalCode && formatted) {
        const zipMatch = formatted.match(/\b(\d{5}(?:-\d{4})?)\b/)
        if (zipMatch) {
          postalCode = zipMatch[1]
        }
      }

      const addressLine1 = `${streetNumber} ${route}`.trim()

      // Log parsed data for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Parsed place details:', {
          name: place.name,
          formattedAddress: place.formatted_address,
          parsed: {
            addressLine1: addressLine1 || place.formatted_address,
            city,
            state,
            postalCode,
            country,
          },
          components: addressComponents.map(c => ({
            types: c.types,
            long_name: c.long_name,
            short_name: c.short_name,
          })),
        })
      }

      return NextResponse.json({
        name: place.name,
        formattedAddress: place.formatted_address,
        addressLine1: addressLine1 || place.formatted_address,
        city: city || '',
        state: state || '',
        postalCode: postalCode || '',
        country: country || '',
        phone: place.formatted_phone_number || '',
        location: place.geometry?.location
          ? {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
            }
          : null,
      })
    } catch (error) {
      console.error('Error fetching place details:', error)
      return NextResponse.json(
        { error: 'Failed to fetch place details' },
        { status: 500 }
      )
    }
  })(request)
}

