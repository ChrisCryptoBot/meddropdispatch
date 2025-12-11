import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Initialize Google Maps client
const client = new Client({})

/**
 * GET /api/geocoding/autocomplete
 * Get address autocomplete suggestions from Google Places API
 * Query params: input (the text being typed)
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

    if (!input || input.length < 3) {
      return NextResponse.json({ predictions: [] })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.warn('⚠️  GOOGLE_MAPS_API_KEY not configured - autocomplete disabled')
      return NextResponse.json({ predictions: [] })
    }

    try {
      const response = await client.placeAutocomplete({
        params: {
          input,
          key: apiKey,
          types: 'address', // Restrict to addresses only
        },
        timeout: 10000,
      })

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        console.warn('Places Autocomplete API error:', response.data.status)
        return NextResponse.json({ predictions: [] })
      }

      // Format predictions for frontend
      const predictions = (response.data.predictions || []).map((prediction) => ({
        description: prediction.description,
        placeId: prediction.place_id,
        structuredFormatting: prediction.structured_formatting,
      }))

      return NextResponse.json({ predictions })
    } catch (error) {
      console.error('Error in autocomplete:', error)
      return NextResponse.json({ predictions: [] })
    }
  })(request)
}

