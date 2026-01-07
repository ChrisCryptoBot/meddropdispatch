// GPS Location Validation Utilities
// Validates driver location against pickup/delivery facilities

import { prisma } from './prisma'

export interface Location {
  latitude: number
  longitude: number
  accuracy?: number // GPS accuracy in meters
}

export interface ValidationResult {
  valid: boolean
  distance: number // in meters
  withinRange: boolean
  message?: string
  facilityLocation?: Location
}

const DEFAULT_TOLERANCE_RADIUS = 100 // 100 meters default
const MAX_TOLERANCE_RADIUS = 500 // Maximum allowed tolerance (500 meters)

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371000 // Earth radius in meters
  const dLat = (loc2.latitude - loc1.latitude) * (Math.PI / 180)
  const dLon = (loc2.longitude - loc1.longitude) * (Math.PI / 180)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.latitude * (Math.PI / 180)) *
      Math.cos(loc2.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Validate pickup location against load's pickup facility
 */
export async function validatePickupLocation(
  loadId: string,
  currentLocation: Location,
  toleranceRadius: number = DEFAULT_TOLERANCE_RADIUS
): Promise<ValidationResult> {
  // Clamp tolerance to maximum
  const tolerance = Math.min(toleranceRadius, MAX_TOLERANCE_RADIUS)

  // Fetch load with pickup facility
  const load = await prisma.loadRequest.findUnique({
    where: { id: loadId },
    include: {
      pickupFacility: true,
    },
  })

  if (!load) {
    return {
      valid: false,
      distance: 0,
      withinRange: false,
      message: 'Load not found',
    }
  }

  if (!load.pickupFacility) {
    return {
      valid: false,
      distance: 0,
      withinRange: false,
      message: 'Pickup facility not found',
    }
  }

  // Check if facility has GPS coordinates
  const facility = load.pickupFacility as any
  if (!facility.latitude || !facility.longitude) {
    // Facility doesn't have GPS coordinates - can't validate
    // This is acceptable for facilities that haven't been geocoded yet
    return {
      valid: true,
      distance: 0,
      withinRange: true,
      message: 'Facility location not geocoded - validation skipped',
      facilityLocation: undefined,
    }
  }

  const facilityLocation: Location = {
    latitude: facility.latitude,
    longitude: facility.longitude,
  }

  // Calculate distance
  const distance = calculateDistance(currentLocation, facilityLocation)

  // Account for GPS accuracy if provided
  const effectiveDistance = currentLocation.accuracy
    ? Math.max(0, distance - currentLocation.accuracy)
    : distance

  const withinRange = effectiveDistance <= tolerance

  return {
    valid: true,
    distance: Math.round(distance),
    withinRange,
    message: withinRange
      ? 'Location verified'
      : `You are ${Math.round(distance)}m away from pickup location (required: within ${tolerance}m)`,
    facilityLocation,
  }
}

/**
 * Validate delivery location against load's delivery facility
 */
export async function validateDeliveryLocation(
  loadId: string,
  currentLocation: Location,
  toleranceRadius: number = DEFAULT_TOLERANCE_RADIUS
): Promise<ValidationResult> {
  // Clamp tolerance to maximum
  const tolerance = Math.min(toleranceRadius, MAX_TOLERANCE_RADIUS)

  // Fetch load with delivery facility
  const load = await prisma.loadRequest.findUnique({
    where: { id: loadId },
    include: {
      dropoffFacility: true,
    },
  })

  if (!load) {
    return {
      valid: false,
      distance: 0,
      withinRange: false,
      message: 'Load not found',
    }
  }

  if (!load.dropoffFacility) {
    return {
      valid: false,
      distance: 0,
      withinRange: false,
      message: 'Delivery facility not found',
    }
  }

  // Check if facility has GPS coordinates
  const dropoffFacility = load.dropoffFacility as any
  if (!dropoffFacility.latitude || !dropoffFacility.longitude) {
    // Facility doesn't have GPS coordinates - can't validate
    return {
      valid: true,
      distance: 0,
      withinRange: true,
      message: 'Facility location not geocoded - validation skipped',
      facilityLocation: undefined,
    }
  }

  const facilityLocation: Location = {
    latitude: dropoffFacility.latitude,
    longitude: dropoffFacility.longitude,
  }

  // Calculate distance
  const distance = calculateDistance(currentLocation, facilityLocation)

  // Account for GPS accuracy if provided
  const effectiveDistance = currentLocation.accuracy
    ? Math.max(0, distance - currentLocation.accuracy)
    : distance

  const withinRange = effectiveDistance <= tolerance

  return {
    valid: true,
    distance: Math.round(distance),
    withinRange,
    message: withinRange
      ? 'Location verified'
      : `You are ${Math.round(distance)}m away from delivery location (required: within ${tolerance}m)`,
    facilityLocation,
  }
}

/**
 * Validate GPS coordinates are within valid ranges
 */
export function validateCoordinates(latitude: number, longitude: number): boolean {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  )
}

/**
 * Validate GPS timestamp - reject future dates or stale points (>12 hours old)
 * @param timestamp - The timestamp to validate
 * @param maxAgeHours - Maximum age in hours (default: 12)
 * @returns Validation result with error message if invalid
 */
export function validateGPSTimestamp(
  timestamp: Date | string,
  maxAgeHours: number = 12
): { valid: boolean; error?: string } {
  const now = new Date()
  const pointTime = typeof timestamp === 'string' ? new Date(timestamp) : timestamp

  // Check if timestamp is valid
  if (isNaN(pointTime.getTime())) {
    return { valid: false, error: 'Invalid timestamp format' }
  }

  // Reject future dates (allow 5 minute tolerance for clock skew)
  const futureTolerance = 5 * 60 * 1000 // 5 minutes in milliseconds
  if (pointTime.getTime() > now.getTime() + futureTolerance) {
    return { valid: false, error: 'GPS timestamp cannot be in the future' }
  }

  // Reject stale points (>12 hours old by default)
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000
  const ageMs = now.getTime() - pointTime.getTime()
  if (ageMs > maxAgeMs) {
    const ageHours = Math.round(ageMs / (60 * 60 * 1000))
    return {
      valid: false,
      error: `GPS point is too old (${ageHours} hours, maximum allowed: ${maxAgeHours} hours)`,
    }
  }

  return { valid: true }
}

/**
 * Check speed plausibility between two GPS points
 * Simple heuristic: if speed > 150mph between last two points, flag as suspicious
 * @param point1 - First GPS point
 * @param point2 - Second GPS point
 * @param maxSpeedMph - Maximum allowed speed in mph (default: 150)
 * @returns Validation result with calculated speed
 */
export function checkSpeedPlausibility(
  point1: { latitude: number; longitude: number; timestamp: Date | string },
  point2: { latitude: number; longitude: number; timestamp: Date | string },
  maxSpeedMph: number = 150
): { valid: boolean; speedMph: number; error?: string } {
  const distanceMeters = calculateDistance(
    { latitude: point1.latitude, longitude: point1.longitude },
    { latitude: point2.latitude, longitude: point2.longitude }
  )

  const time1 = typeof point1.timestamp === 'string' ? new Date(point1.timestamp) : point1.timestamp
  const time2 = typeof point2.timestamp === 'string' ? new Date(point2.timestamp) : point2.timestamp

  const timeDiffMs = Math.abs(time2.getTime() - time1.getTime())
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60)

  // Avoid division by zero
  if (timeDiffHours === 0) {
    return { valid: true, speedMph: 0 }
  }

  const distanceMiles = distanceMeters / 1609.34 // Convert meters to miles
  const speedMph = distanceMiles / timeDiffHours

  if (speedMph > maxSpeedMph) {
    return {
      valid: false,
      speedMph,
      error: `Implausible speed detected: ${Math.round(speedMph)} mph (maximum allowed: ${maxSpeedMph} mph)`,
    }
  }

  return { valid: true, speedMph }
}

/**
 * Geocode an address to GPS coordinates (placeholder - integrate with geocoding service)
 * This should be implemented with Google Maps Geocoding API, Mapbox, or similar
 */
export async function geocodeAddress(address: {
  addressLine1: string
  addressLine2?: string | null
  city: string
  state: string
  postalCode: string
}): Promise<Location | null> {
  // TODO: Integrate with geocoding service
  // For now, return null - facilities should be geocoded manually or via admin interface
  return null
}

