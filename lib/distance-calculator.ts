// Distance Calculator Utility
// Uses Google Maps Distance Matrix API to calculate distance and time between addresses

import { Client } from '@googlemaps/google-maps-services-js'
import { DistanceCalculation } from './types'

// Initialize Google Maps client
const client = new Client({})

/**
 * Calculate distance and travel time between two addresses
 * Returns distance in miles and duration in minutes
 */
export async function calculateDistance(
  originAddress: string,
  destinationAddress: string
): Promise<DistanceCalculation> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn(
      '⚠️  GOOGLE_MAPS_API_KEY not configured - distance calculation disabled'
    )
    return {
      distance: 0,
      duration: 0,
      success: false,
      error: 'Google Maps API key not configured',
    }
  }

  try {
    const response = await client.distancematrix({
      params: {
        origins: [originAddress],
        destinations: [destinationAddress],
        // @ts-ignore - units type is incorrect in the library
        units: 'imperial', // Use miles
        key: apiKey,
      },
      timeout: 10000, // 10 second timeout
    })

    if (response.data.status !== 'OK') {
      console.warn('Distance Matrix API error:', response.data.status)
      return {
        distance: 0,
        duration: 0,
        success: false,
        error: `API error: ${response.data.status}`,
      }
    }

    const element = response.data.rows[0]?.elements[0]

    if (!element || element.status !== 'OK') {
      console.warn('No route found between addresses:', {
        origin: originAddress,
        destination: destinationAddress,
        status: element?.status,
      })
      return {
        distance: 0,
        duration: 0,
        success: false,
        error: element?.status || 'No route found',
      }
    }

    // Convert meters to miles
    const distanceInMiles = element.distance.value / 1609.34

    // Convert seconds to minutes
    const durationInMinutes = Math.ceil(element.duration.value / 60)

    return {
      distance: Math.round(distanceInMiles * 10) / 10, // Round to 1 decimal place
      duration: durationInMinutes,
      success: true,
    }
  } catch (error) {
    console.error('Error calculating distance:', error)
    return {
      distance: 0,
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Calculate distance between two coordinate points
 * Uses Haversine formula (fallback if addresses aren't available)
 */
export function calculateDistanceFromCoordinates(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959 // Earth's radius in miles

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const distance = R * c

  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Estimate travel time based on distance
 * Assumes average speed of 45 mph
 */
export function estimateTravelTime(distanceInMiles: number): number {
  const averageSpeedMph = 45
  const hours = distanceInMiles / averageSpeedMph
  const minutes = Math.ceil(hours * 60)
  return minutes
}

/**
 * Calculate multiple routes in parallel
 */
export async function calculateMultipleDistances(
  routes: Array<{ origin: string; destination: string }>
): Promise<DistanceCalculation[]> {
  const promises = routes.map((route) =>
    calculateDistance(route.origin, route.destination)
  )
  return Promise.all(promises)
}

