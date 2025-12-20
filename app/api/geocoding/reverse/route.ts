import { NextRequest, NextResponse } from 'next/server'
import { reverseGeocode } from '@/lib/geocoding'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/geocoding/reverse
 * Reverse geocode coordinates to get address
 * Query params: lat, lng
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
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates. lat and lng are required.' },
        { status: 400 }
      )
    }

    const result = await reverseGeocode(lat, lng)

    if (!result) {
      return NextResponse.json(
        { error: 'Could not reverse geocode coordinates' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      address: result.formattedAddress,
      city: result.city,
      state: result.state,
      postalCode: result.postalCode,
      latitude: result.latitude,
      longitude: result.longitude,
    })
  })(request)
}


