import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Initialize Google Maps client
const client = new Client({})

/**
 * GET /api/geocoding/facility-autocomplete
 * Get facility/business autocomplete suggestions from Google Places API
 * Query params: 
 *   - input: the text being typed (facility name)
 *   - location: optional "lat,lng" to bias results toward nearby places
 *   - radius: optional radius in meters (default 50000 = 50km)
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
    const input = searchParams.get('input')
    const locationParam = searchParams.get('location') // "lat,lng"
    const radius = parseInt(searchParams.get('radius') || '50000') // Default 50km

    if (!input || input.length < 2) {
      return NextResponse.json({ predictions: [] })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.warn('⚠️  GOOGLE_MAPS_API_KEY not configured - facility autocomplete disabled')
      return NextResponse.json({ 
        predictions: [],
        error: 'Google Maps API key not configured',
        message: 'Please set GOOGLE_MAPS_API_KEY in your .env file'
      })
    }

    try {
      const params: any = {
        input,
        key: apiKey,
        types: 'establishment', // Search for businesses/establishments
      }

      // If location is provided, bias results toward that location
      if (locationParam) {
        const [lat, lng] = locationParam.split(',').map(Number)
        if (!isNaN(lat) && !isNaN(lng)) {
          params.location = `${lat},${lng}`
          params.radius = radius
        }
      }

      const response = await client.placeAutocomplete({
        params,
        timeout: 10000,
      })

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        console.warn('Places Autocomplete API error:', response.data.status, response.data.error_message)
        return NextResponse.json({ 
          predictions: [],
          error: `Google Places API error: ${response.data.status}${response.data.error_message ? ` - ${response.data.error_message}` : ''}`
        })
      }

      // Format predictions for frontend
      const predictions = (response.data.predictions || []).map((prediction) => ({
        description: prediction.description,
        placeId: prediction.place_id,
        structuredFormatting: prediction.structured_formatting,
      }))

      return NextResponse.json({ predictions })
    } catch (error) {
      console.error('Error in facility autocomplete:', error)
      return NextResponse.json({ 
        predictions: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  })(request)
}


