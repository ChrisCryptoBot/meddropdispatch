import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@googlemaps/google-maps-services-js'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Initialize Google Maps client
const client = new Client({})

/**
 * GET /api/geocoding/place-details
 * Get detailed information about a place from Google Places API
 * Query params:
 *   - placeId: The Google Places place ID
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
      console.warn('⚠️  GOOGLE_MAPS_API_KEY not configured - place details disabled')
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 503 }
      )
    }

    try {
      const response = await client.placeDetails({
        params: {
          place_id: placeId,
          key: apiKey,
          fields: [
            'name',
            'formatted_address',
            'address_components',
            'formatted_phone_number',
            'geometry',
          ],
        },
        timeout: 10000,
      })

      if (response.data.status !== 'OK') {
        console.warn('Place Details API error:', response.data.status)
        return NextResponse.json(
          { error: `Failed to fetch place details: ${response.data.status}` },
          { status: 400 }
        )
      }

      const place = response.data.result

      // Parse address components
      const addressComponents = place.address_components || []
      let addressLine1 = ''
      let city = ''
      let state = ''
      let postalCode = ''
      let country = ''

      // Extract street number and route for addressLine1
      const streetNumber = addressComponents.find((c: any) => c.types.includes('street_number'))?.long_name || ''
      const route = addressComponents.find((c: any) => c.types.includes('route'))?.long_name || ''
      addressLine1 = [streetNumber, route].filter(Boolean).join(' ').trim() || place.formatted_address?.split(',')[0] || ''

      // Extract city
      city = addressComponents.find((c: any) => c.types.includes('locality'))?.long_name ||
             addressComponents.find((c: any) => c.types.includes('administrative_area_level_2'))?.long_name ||
             ''

      // Extract state
      state = addressComponents.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name || ''

      // Extract postal code
      postalCode = addressComponents.find((c: any) => c.types.includes('postal_code'))?.long_name || ''

      // Extract country
      country = addressComponents.find((c: any) => c.types.includes('country'))?.short_name || ''

      // Return structured data
      return NextResponse.json({
        name: place.name || '',
        formattedAddress: place.formatted_address || '',
        addressLine1: addressLine1,
        city: city,
        state: state,
        postalCode: postalCode,
        country: country,
        phone: place.formatted_phone_number || '',
        latitude: place.geometry?.location?.lat || null,
        longitude: place.geometry?.location?.lng || null,
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
