// Geocoding Utility
// Uses Google Maps Geocoding API to convert addresses to coordinates

import { Client } from '@googlemaps/google-maps-services-js'
import { GeocodedAddress } from './types'

// Initialize Google Maps client
const client = new Client({})

/**
 * Geocode an address string to coordinates
 * Returns formatted address and coordinates
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodedAddress | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn('⚠️  GOOGLE_MAPS_API_KEY not configured - geocoding disabled')
    return null
  }

  try {
    const response = await client.geocode({
      params: {
        address,
        key: apiKey,
      },
      timeout: 10000, // 10 second timeout
    })

    if (response.data.status !== 'OK' || response.data.results.length === 0) {
      console.warn(`Geocoding failed for address: ${address}`, {
        status: response.data.status,
      })
      return null
    }

    const result = response.data.results[0]
    const location = result.geometry.location

    // Extract city, state, ZIP from address components
    const addressComponents = result.address_components
    const city =
      addressComponents.find((c) => c.types.includes('locality' as any))?.long_name ||
      addressComponents.find((c) => c.types.includes('sublocality' as any))
        ?.long_name ||
      ''

    const state =
      addressComponents.find((c) => c.types.includes('administrative_area_level_1' as any))
        ?.short_name || ''

    const postalCode =
      addressComponents.find((c) => c.types.includes('postal_code' as any))?.long_name ||
      ''

    return {
      formattedAddress: result.formatted_address,
      latitude: location.lat,
      longitude: location.lng,
      city,
      state,
      postalCode,
    }
  } catch (error) {
    console.error('Error geocoding address:', error)
    return null
  }
}

/**
 * Geocode multiple addresses in parallel
 * Returns array of geocoded addresses (null for failed ones)
 */
export async function geocodeAddresses(
  addresses: string[]
): Promise<(GeocodedAddress | null)[]> {
  const promises = addresses.map((address) => geocodeAddress(address))
  return Promise.all(promises)
}

/**
 * Validate that an address is geocodable
 * Returns true if address can be found via Google Maps
 */
export async function validateAddress(address: string): Promise<boolean> {
  const result = await geocodeAddress(address)
  return result !== null
}

/**
 * Get coordinates from address
 * Returns just the lat/lng if successful
 */
export async function getCoordinates(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  const result = await geocodeAddress(address)

  if (!result) {
    return null
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
  }
}

/**
 * Reverse geocode coordinates to get address
 * Converts lat/lng to formatted address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodedAddress | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn('⚠️  GOOGLE_MAPS_API_KEY not configured - reverse geocoding disabled')
    return null
  }

  try {
    const response = await client.reverseGeocode({
      params: {
        latlng: { lat: latitude, lng: longitude },
        key: apiKey,
      },
      timeout: 10000,
    })

    if (response.data.status !== 'OK' || response.data.results.length === 0) {
      console.warn(`Reverse geocoding failed for coordinates: ${latitude}, ${longitude}`, {
        status: response.data.status,
      })
      return null
    }

    const result = response.data.results[0]
    const location = result.geometry.location

    // Extract address components
    const addressComponents = result.address_components
    const city =
      addressComponents.find((c) => c.types.includes('locality' as any))?.long_name ||
      addressComponents.find((c) => c.types.includes('sublocality' as any))?.long_name ||
      ''

    const state =
      addressComponents.find((c) => c.types.includes('administrative_area_level_1' as any))
        ?.short_name || ''

    const postalCode =
      addressComponents.find((c) => c.types.includes('postal_code' as any))?.long_name || ''

    return {
      formattedAddress: result.formatted_address,
      latitude: location.lat,
      longitude: location.lng,
      city,
      state,
      postalCode,
    }
  } catch (error) {
    console.error('Error reverse geocoding coordinates:', error)
    return null
  }
}

