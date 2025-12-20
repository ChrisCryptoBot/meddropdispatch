/**
 * GPS Route Export Utilities
 * Generates URLs for opening routes in various GPS/navigation apps
 */

export interface RouteAddress {
  addressLine1: string
  addressLine2?: string | null
  city: string
  state: string
  postalCode: string
  name?: string
}

export type GPSApp = 'google' | 'apple' | 'waze'

/**
 * Format address for GPS apps
 */
function formatAddress(address: RouteAddress): string {
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
  ].filter(Boolean)
  return encodeURIComponent(parts.join(', '))
}

/**
 * Generate Google Maps route URL
 */
export function getGoogleMapsRouteUrl(
  pickup: RouteAddress,
  dropoff: RouteAddress
): string {
  const pickupAddr = formatAddress(pickup)
  const dropoffAddr = formatAddress(dropoff)
  return `https://www.google.com/maps/dir/${pickupAddr}/${dropoffAddr}`
}

/**
 * Generate Apple Maps route URL
 */
export function getAppleMapsRouteUrl(
  pickup: RouteAddress,
  dropoff: RouteAddress
): string {
  const pickupAddr = formatAddress(pickup)
  const dropoffAddr = formatAddress(dropoff)
  return `https://maps.apple.com/?daddr=${dropoffAddr}&saddr=${pickupAddr}`
}

/**
 * Generate Waze route URL
 */
export function getWazeRouteUrl(
  pickup: RouteAddress,
  dropoff: RouteAddress
): string {
  const pickupAddr = formatAddress(pickup)
  const dropoffAddr = formatAddress(dropoff)
  return `https://www.waze.com/ul?navigate=yes&to=ll.${dropoffAddr}&from=ll.${pickupAddr}`
}

/**
 * Get route URL for a specific GPS app
 */
export function getRouteUrl(
  app: GPSApp,
  pickup: RouteAddress,
  dropoff: RouteAddress
): string {
  switch (app) {
    case 'google':
      return getGoogleMapsRouteUrl(pickup, dropoff)
    case 'apple':
      return getAppleMapsRouteUrl(pickup, dropoff)
    case 'waze':
      return getWazeRouteUrl(pickup, dropoff)
    default:
      return getGoogleMapsRouteUrl(pickup, dropoff)
  }
}

/**
 * Open route in GPS app
 */
export function openRouteInGPS(
  app: GPSApp,
  pickup: RouteAddress,
  dropoff: RouteAddress
): void {
  const url = getRouteUrl(app, pickup, dropoff)
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Get all available GPS app URLs for a route
 */
export function getAllRouteUrls(
  pickup: RouteAddress,
  dropoff: RouteAddress
): Record<GPSApp, string> {
  return {
    google: getGoogleMapsRouteUrl(pickup, dropoff),
    apple: getAppleMapsRouteUrl(pickup, dropoff),
    waze: getWazeRouteUrl(pickup, dropoff),
  }
}

