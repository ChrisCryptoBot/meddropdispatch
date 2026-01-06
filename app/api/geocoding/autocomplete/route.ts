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
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { searchParams } = new URL(req.url)
    const rawInput = searchParams.get('input')

    // Input sanitization
    if (!rawInput || rawInput.length < 3) {
      return NextResponse.json({ predictions: [] })
    }

    // Sanitize input: remove special characters that could cause issues
    const input = rawInput.trim().substring(0, 200) // Max 200 chars

    // Validate input doesn't contain suspicious patterns
    if (/[<>{}[\]\\]/.test(input)) {
      return NextResponse.json({
        predictions: [],
        error: 'Invalid characters in search query'
      }, { status: 400 })
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
        },
        timeout: 5000, // Reduced timeout to 5s
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
    } catch (error: any) {
      // Handle timeout specifically
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        console.error('Geocoding API timeout:', error)
        return NextResponse.json({
          predictions: [],
          error: 'Geocoding service timeout'
        }, { status: 504 })
      }

      console.error('Error in autocomplete:', error)
      return NextResponse.json({ predictions: [] })
    }
  })(request)
}
