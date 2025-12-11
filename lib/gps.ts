// GPS Location Utility
// Captures GPS coordinates using navigator.geolocation

export interface GPSLocation {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: number
}

/**
 * Get current GPS location
 */
export async function getCurrentLocation(): Promise<GPSLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        })
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`))
      },
      options
    )
  })
}

/**
 * Watch GPS location (for continuous tracking)
 */
export function watchLocation(
  callback: (location: GPSLocation) => void,
  errorCallback?: (error: Error) => void
): number {
  if (!navigator.geolocation) {
    if (errorCallback) {
      errorCallback(new Error('Geolocation is not supported'))
    }
    return -1
  }

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      })
    },
    (error) => {
      if (errorCallback) {
        errorCallback(new Error(`Geolocation error: ${error.message}`))
      }
    },
    options
  )
}

/**
 * Stop watching GPS location
 */
export function clearWatch(watchId: number): void {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId)
  }
}

/**
 * Format GPS coordinates for display
 */
export function formatCoordinates(location: GPSLocation): string {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
}

/**
 * Get address from coordinates (reverse geocoding)
 * Note: This would require a geocoding service like Google Maps
 */
export async function getAddressFromCoordinates(
  latitude: number,
  longitude: number
): Promise<string | null> {
  // This would integrate with Google Maps Geocoding API
  // For now, return formatted coordinates
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
}

