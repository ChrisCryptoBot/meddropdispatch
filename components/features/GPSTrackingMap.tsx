'use client'

import { useEffect, useState, useRef } from 'react'
import { formatDateTime } from '@/lib/utils'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Leaflet with Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface GPSTrackingPoint {
  id: string
  latitude: number
  longitude: number
  accuracy?: number | null
  heading?: number | null
  speed?: number | null
  altitude?: number | null
  timestamp: string
}

interface Facility {
  id: string
  name: string
  addressLine1: string
  addressLine2?: string | null
  city: string
  state: string
  postalCode: string
  latitude?: number | null
  longitude?: number | null
}

interface Location {
  id: string
  locationType: 'PICKUP' | 'DROPOFF'
  sequence: number
  facility: Facility
  readyTime?: string | null
  accessNotes?: string | null
}

interface DriverInfo {
  id: string
  firstName: string
  lastName: string
  phone: string
  vehicleType?: string
}

interface GPSTrackingMapProps {
  loadId: string
  pickupAddress: string
  dropoffAddress: string
  enabled: boolean
  fullScreen?: boolean
  onCloseFullScreen?: () => void
  driver?: DriverInfo | null
  uberStyle?: boolean // Enable Uber-style UI
  onCallDriver?: () => void // Callback for call driver button
}

export default function GPSTrackingMap({ 
  loadId, 
  pickupAddress, 
  dropoffAddress, 
  enabled,
  fullScreen = false,
  onCloseFullScreen,
  driver,
  uberStyle = false,
  onCallDriver
}: GPSTrackingMapProps) {
  const [trackingPoints, setTrackingPoints] = useState<GPSTrackingPoint[]>([])
  const [pickupFacility, setPickupFacility] = useState<Facility | null>(null)
  const [dropoffFacility, setDropoffFacility] = useState<Facility | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedPoint, setSelectedPoint] = useState<GPSTrackingPoint | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylineRef = useRef<L.Polyline | null>(null)
  const driverMarkerRef = useRef<L.Marker | null>(null)
  const hasInitialBoundsRef = useRef<boolean>(false)
  const userInteractedRef = useRef<boolean>(false)

  // Initialize Leaflet map
  useEffect(() => {
    if (!enabled || !mapContainerRef.current || mapRef.current) return

    // Reset interaction tracking when map is reinitialized
    hasInitialBoundsRef.current = false
    userInteractedRef.current = false

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([33.1267, -96.1308], 13)
    mapRef.current = map

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    // Track user interactions (zoom, pan, etc.)
    map.on('zoomstart', () => {
      userInteractedRef.current = true
    })
    map.on('movestart', () => {
      userInteractedRef.current = true
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      hasInitialBoundsRef.current = false
      userInteractedRef.current = false
    }
  }, [enabled])

  // Update map with markers and route
  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Calculate ETA based on distance and speed
  const calculateETA = (distanceMiles: number, speedMph: number | null | undefined): string | null => {
    // If no speed or speed is 0, can't calculate ETA
    if (!speedMph || speedMph <= 0) return null
    
    // If distance is 0 or very small, already arrived
    if (distanceMiles < 0.01) return 'Arrived'
    
    const hours = distanceMiles / speedMph
    const minutes = Math.round(hours * 60)
    
    if (minutes < 1) return 'Less than 1 min'
    if (minutes < 60) return `${minutes} min`
    
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
  }

  // Calculate distance and ETA from driver to destination
  const getDriverToDestinationInfo = () => {
    if (trackingPoints.length === 0) return null
    const latest = trackingPoints[trackingPoints.length - 1]
    
    // Find destination (dropoff or last location)
    let destination: { lat: number; lng: number } | null = null
    
    if (locations.length > 0) {
      // Find last dropoff location
      const dropoffLocations = locations.filter(loc => loc.locationType === 'DROPOFF')
      if (dropoffLocations.length > 0) {
        const lastDropoff = dropoffLocations[dropoffLocations.length - 1]
        if (lastDropoff.facility.latitude && lastDropoff.facility.longitude) {
          destination = {
            lat: lastDropoff.facility.latitude,
            lng: lastDropoff.facility.longitude
          }
        }
      }
    }
    
    // Fallback to single dropoff facility
    if (!destination && dropoffFacility?.latitude && dropoffFacility?.longitude) {
      destination = {
        lat: dropoffFacility.latitude,
        lng: dropoffFacility.longitude
      }
    }
    
    if (!destination) return null
    
    const distance = calculateDistance(
      latest.latitude,
      latest.longitude,
      destination.lat,
      destination.lng
    )
    
    const speedMph = latest.speed ? latest.speed * 2.237 : null
    const eta = calculateETA(distance, speedMph)
    
    return { distance, eta, speedMph }
  }

  // Helper function to create driver icon with rotation based on heading
  const createDriverIcon = (heading: number | null | undefined): L.DivIcon => {
    // If heading is available, use it; otherwise default to 0 (north)
    const rotation = heading !== null && heading !== undefined ? heading : 0
    
    // Create a navigation-style arrow that points in the direction of travel
    // Heading is in degrees (0-360, where 0 is north, 90 is east, etc.)
    return L.divIcon({
      className: 'driver-location-marker',
      html: `
        <div style="
          transform: rotate(${rotation}deg);
          transform-origin: center;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="40" height="40" viewBox="0 0 40 40" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <!-- Outer circle -->
            <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="white" stroke-width="3"/>
            <!-- Arrow pointing up (will be rotated by heading) -->
            <path d="M 20 8 L 16 16 L 20 12 L 24 16 Z" fill="white"/>
            <!-- Center dot -->
            <circle cx="20" cy="20" r="6" fill="white"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })
  }

  const updateMap = (points: GPSTrackingPoint[], pickup?: Facility | null, dropoff?: Facility | null, allLocations?: Location[], useUberStyle?: boolean) => {
    if (!mapRef.current) return

    const map = mapRef.current
    
    // If no points and no locations, don't update
    if (points.length === 0 && (!allLocations || allLocations.length === 0) && !pickup && !dropoff) return
    
    const latest = points.length > 0 ? points[points.length - 1] : null

    // Clear existing markers and polyline
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
    if (driverMarkerRef.current) {
      driverMarkerRef.current.remove()
      driverMarkerRef.current = null
    }
    if (polylineRef.current) {
      polylineRef.current.remove()
      polylineRef.current = null
    }

    // Add markers for all locations (pickups and dropoffs)
    const locationMarkers: Array<{ marker: L.Marker; type: 'PICKUP' | 'DROPOFF'; sequence: number }> = []
    
    // Add all pickup locations
    const pickupLocations = (allLocations || []).filter(loc => loc.locationType === 'PICKUP')
    pickupLocations.forEach((loc) => {
      if (loc.facility.latitude && loc.facility.longitude) {
        const marker = L.marker([loc.facility.latitude, loc.facility.longitude], {
          icon: L.divIcon({
            className: 'pickup-marker',
            html: `
              <div style="
                width: 28px;
                height: 28px;
                background: #10b981;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 11px;
              ">${loc.sequence}</div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(map)
        
        const address = `${loc.facility.addressLine1}${loc.facility.addressLine2 ? ', ' + loc.facility.addressLine2 : ''}, ${loc.facility.city}, ${loc.facility.state}`
        marker.bindPopup(`
          <div style="text-align: left;">
            <strong>Pickup ${loc.sequence}</strong><br>
            ${loc.facility.name}<br>
            <small>${address}</small>
          </div>
        `)
        locationMarkers.push({ marker, type: 'PICKUP', sequence: loc.sequence })
        markersRef.current.push(marker)
      }
    })

    // Add all dropoff locations
    const dropoffLocations = (allLocations || []).filter(loc => loc.locationType === 'DROPOFF')
    dropoffLocations.forEach((loc) => {
      if (loc.facility.latitude && loc.facility.longitude) {
        const marker = L.marker([loc.facility.latitude, loc.facility.longitude], {
          icon: L.divIcon({
            className: 'dropoff-marker',
            html: `
              <div style="
                width: 28px;
                height: 28px;
                background: #ef4444;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 11px;
              ">${loc.sequence}</div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(map)
        
        const address = `${loc.facility.addressLine1}${loc.facility.addressLine2 ? ', ' + loc.facility.addressLine2 : ''}, ${loc.facility.city}, ${loc.facility.state}`
        marker.bindPopup(`
          <div style="text-align: left;">
            <strong>Dropoff ${loc.sequence}</strong><br>
            ${loc.facility.name}<br>
            <small>${address}</small>
          </div>
        `)
        locationMarkers.push({ marker, type: 'DROPOFF', sequence: loc.sequence })
        markersRef.current.push(marker)
      }
    })

    // Fallback to single pickup/dropoff if no locations array
    if (!allLocations || allLocations.length === 0) {
      if (pickup?.latitude && pickup?.longitude) {
        const pickupMarker = L.marker([pickup.latitude, pickup.longitude], {
          icon: L.divIcon({
            className: 'pickup-marker',
            html: `
              <div style="
                width: 24px;
                height: 24px;
                background: #10b981;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 12px;
              ">P</div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(map)
        pickupMarker.bindPopup(`<strong>Pickup</strong><br>${pickup.name}<br>${pickup.addressLine1}`)
        markersRef.current.push(pickupMarker)
      }

      if (dropoff?.latitude && dropoff?.longitude) {
        const dropoffMarker = L.marker([dropoff.latitude, dropoff.longitude], {
          icon: L.divIcon({
            className: 'dropoff-marker',
            html: `
              <div style="
                width: 24px;
                height: 24px;
                background: #ef4444;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 12px;
              ">D</div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(map)
        dropoffMarker.bindPopup(`<strong>Dropoff</strong><br>${dropoff.name}<br>${dropoff.addressLine1}`)
        markersRef.current.push(dropoffMarker)
      }
    }

    // Removed: Polylines between locations - shipper only sees driver arrow and pickup/dropoff points

    // Add driver's current location marker (blue arrow that rotates based on heading) - only if we have tracking points
    if (latest) {
      // Create icon with rotation based on heading
      const driverIcon = createDriverIcon(latest.heading)
      const driverMarker = L.marker([latest.latitude, latest.longitude], {
        icon: driverIcon,
      }).addTo(map)
      
      // Store reference for cleanup
      driverMarkerRef.current = driverMarker
      
      const speedText = latest.speed ? `${(latest.speed * 2.237).toFixed(0)} mph` : 'N/A'
      const accuracyText = latest.accuracy ? `${latest.accuracy.toFixed(0)}m` : 'N/A'
      const headingText = latest.heading !== null && latest.heading !== undefined 
        ? `${Math.round(latest.heading)}°` 
        : 'N/A'
      
      driverMarker.bindPopup(`
        <div style="text-align: center;">
          <strong>Driver Location</strong><br>
          <small>${formatDateTime(latest.timestamp)}</small><br>
          Speed: ${speedText}<br>
          Heading: ${headingText}<br>
          Accuracy: ${accuracyText}
        </div>
      `)
      markersRef.current.push(driverMarker)
      
      // Removed: Route polyline from driver to destination - shipper only sees driver arrow and pickup/dropoff points
    }

    // Only fit bounds on initial load or if user hasn't interacted with the map
    if (!hasInitialBoundsRef.current || !userInteractedRef.current) {
      const bounds = L.latLngBounds([])
      
      // Add tracking points to bounds
      if (points.length > 0) {
        points.forEach(p => bounds.extend([p.latitude, p.longitude]))
      }
      
      // Add all location markers to bounds
      if (allLocations && allLocations.length > 0) {
        allLocations.forEach(loc => {
          if (loc.facility.latitude && loc.facility.longitude) {
            bounds.extend([loc.facility.latitude, loc.facility.longitude])
          }
        })
      } else {
        // Fallback to single pickup/dropoff
        if (pickup?.latitude && pickup?.longitude) {
          bounds.extend([pickup.latitude, pickup.longitude])
        }
        if (dropoff?.latitude && dropoff?.longitude) {
          bounds.extend([dropoff.latitude, dropoff.longitude])
        }
      }
      
      // Only fit bounds if we have at least one point or location
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] })
        hasInitialBoundsRef.current = true
      }
    }
  }

  // Fetch GPS tracking data
  useEffect(() => {
    if (!enabled || !loadId) return

    const fetchTrackingData = async () => {
      try {
        const response = await fetch(`/api/load-requests/${loadId}/gps-tracking`)
        if (!response.ok) return

        const data = await response.json()
        if (data.gpsTrackingEnabled !== undefined) {
          setTrackingPoints(data.trackingPoints || [])
          if (data.pickupFacility) setPickupFacility(data.pickupFacility)
          if (data.dropoffFacility) setDropoffFacility(data.dropoffFacility)
          if (data.locations) setLocations(data.locations)
        } else {
          // Even if GPS tracking is not enabled, show locations
          if (data.pickupFacility) setPickupFacility(data.pickupFacility)
          if (data.dropoffFacility) setDropoffFacility(data.dropoffFacility)
          if (data.locations) setLocations(data.locations)
        }
      } catch (error) {
        console.error('Error fetching GPS tracking data:', error)
      }
    }

    fetchTrackingData()
    const interval = setInterval(fetchTrackingData, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [enabled, loadId, pickupAddress, dropoffAddress])

  // Update map when tracking points or locations change
  useEffect(() => {
    if (mapRef.current) {
      // Always update map if we have locations or facilities, even without tracking points
      if (locations.length > 0 || pickupFacility || dropoffFacility || trackingPoints.length > 0) {
        updateMap(trackingPoints, pickupFacility, dropoffFacility, locations, uberStyle)
      }
    }
  }, [trackingPoints, pickupFacility, dropoffFacility, locations, uberStyle])

  if (!enabled) {
    return (
      <div className={`glass p-8 rounded-2xl text-center ${fullScreen ? 'h-full flex items-center justify-center' : ''}`}>
        <div>
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-lg font-semibold text-gray-700 mb-2">GPS Tracking Not Enabled</p>
          <p className="text-sm text-gray-500">
            The driver has not enabled real-time GPS tracking for this load.
          </p>
        </div>
      </div>
    )
  }

  const driverInfo = getDriverToDestinationInfo()

  // Uber-style UI
  if (uberStyle) {
    return (
      <div className={`relative ${fullScreen ? 'h-full' : 'h-[600px]'} rounded-2xl overflow-hidden bg-gray-100`}>
        {/* Minimal Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">Live Tracking</span>
            </div>
            {fullScreen && onCloseFullScreen && (
              <button
                onClick={onCloseFullScreen}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Map */}
        <div 
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ zIndex: 0 }}
        />

        {/* Driver Info Card (Uber-style bottom card) */}
        {driver && trackingPoints.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl border-t border-gray-200">
            <div className="px-6 pt-4 pb-6">
              {/* Drag handle */}
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
              
              {/* Driver Info */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {driver.firstName[0]}{driver.lastName[0]}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">
                    {driver.firstName} {driver.lastName}
                  </h3>
                  {driver.vehicleType && (
                    <p className="text-sm text-gray-600">{driver.vehicleType}</p>
                  )}
                </div>
                {onCallDriver && (
                  <button
                    onClick={onCallDriver}
                    className="w-12 h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg transition-colors"
                    title="Call Driver"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* ETA and Distance */}
              {driverInfo && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Distance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {driverInfo.distance.toFixed(1)} <span className="text-base font-normal text-gray-600">mi</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">ETA</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {driverInfo.eta || (driverInfo.speedMph && driverInfo.speedMph > 0 ? 'Calculating...' : 'Speed needed')}
                    </p>
                  </div>
                </div>
              )}

              {/* Last Update */}
              {trackingPoints.length > 0 && (
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Last update: {formatDateTime(trackingPoints[trackingPoints.length - 1].timestamp)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Standard UI (existing)
  return (
    <div className={`glass rounded-2xl overflow-hidden ${fullScreen ? 'h-full flex flex-col' : ''}`}>
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Real-Time GPS Tracking</h3>
            <p className="text-sm text-gray-600">
              {trackingPoints.length > 0
                ? `Last update: ${formatDateTime(trackingPoints[trackingPoints.length - 1].timestamp)}`
                : 'Waiting for location updates...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {fullScreen && onCloseFullScreen && (
              <button
                onClick={onCloseFullScreen}
                className="px-3 py-1 rounded-lg bg-white/80 hover:bg-white text-gray-700 font-medium transition-colors"
              >
                Close
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">Live</span>
            </div>
          </div>
        </div>
      </div>
      
      <div 
        ref={mapContainerRef}
        className={`w-full bg-gray-100 overflow-hidden ${fullScreen ? 'flex-1' : 'h-96'}`}
        style={{ zIndex: 0 }}
      />

      {/* Timeline and Stats */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div>
            <p className="text-gray-600 mb-1 text-sm">Total Points</p>
            <p className="font-semibold text-gray-900">{trackingPoints.length}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1 text-sm">Latest Speed</p>
            <p className="font-semibold text-gray-900">
              {trackingPoints.length > 0 && trackingPoints[trackingPoints.length - 1].speed
                ? `${(trackingPoints[trackingPoints.length - 1].speed! * 2.237).toFixed(0)} mph`
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1 text-sm">Heading</p>
            <p className="font-semibold text-gray-900">
              {trackingPoints.length > 0 && trackingPoints[trackingPoints.length - 1].heading !== null && trackingPoints[trackingPoints.length - 1].heading !== undefined
                ? `${Math.round(trackingPoints[trackingPoints.length - 1].heading!)}°`
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1 text-sm">Accuracy</p>
            <p className="font-semibold text-gray-900">
              {trackingPoints.length > 0 && trackingPoints[trackingPoints.length - 1].accuracy
                ? `${trackingPoints[trackingPoints.length - 1].accuracy!.toFixed(0)}m`
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-600 mb-1 text-sm">Tracking Started</p>
            <p className="font-semibold text-gray-900 text-xs">
              {trackingPoints.length > 0
                ? formatDateTime(trackingPoints[0].timestamp)
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Timeline View */}
        {trackingPoints.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Tracking Timeline</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {trackingPoints.slice(-10).reverse().map((point, index) => (
                <div
                  key={point.id}
                  onClick={() => setSelectedPoint(point)}
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedPoint?.id === point.id
                      ? 'bg-blue-100 border border-blue-300'
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {formatDateTime(point.timestamp)}
                    </span>
                    <span className="text-gray-500">
                      {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </span>
                  </div>
                  {point.speed && (
                    <div className="text-xs text-gray-500 mt-1">
                      Speed: {(point.speed * 2.237).toFixed(0)} mph
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
