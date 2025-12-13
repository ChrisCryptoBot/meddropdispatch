'use client'

import { useEffect, useState } from 'react'

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

interface GPSTrackingMapProps {
  loadId: string
  pickupAddress: string
  dropoffAddress: string
  enabled: boolean
}

export default function GPSTrackingMap({ loadId, pickupAddress, dropoffAddress, enabled }: GPSTrackingMapProps) {
  const [trackingPoints, setTrackingPoints] = useState<GPSTrackingPoint[]>([])
  const [mapUrl, setMapUrl] = useState<string>('')

  // Fetch GPS tracking data
  useEffect(() => {
    if (!enabled || !loadId) return

    const fetchTrackingData = async () => {
      try {
        const response = await fetch(`/api/load-requests/${loadId}/gps-tracking`)
        if (!response.ok) return

        const data = await response.json()
        if (data.gpsTrackingEnabled && data.trackingPoints) {
          setTrackingPoints(data.trackingPoints)
          
          // Generate static map URL with latest location
          if (data.trackingPoints.length > 0) {
            const latest = data.trackingPoints[data.trackingPoints.length - 1]
            // Using OpenStreetMap static map (free, no API key needed)
            const markers = [
              `color:green|label:P|${pickupAddress}`,
              `color:red|label:D|${dropoffAddress}`,
              `color:blue|label:Driver|${latest.latitude},${latest.longitude}`,
            ].join('&markers=')
            setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${latest.longitude - 0.1},${latest.latitude - 0.1},${latest.longitude + 0.1},${latest.latitude + 0.1}&layer=mapnik&marker=${latest.latitude},${latest.longitude}`)
          }
        }
      } catch (error) {
        console.error('Error fetching GPS tracking data:', error)
      }
    }

    fetchTrackingData()
    const interval = setInterval(fetchTrackingData, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [enabled, loadId, pickupAddress, dropoffAddress])


  if (!enabled) {
    return (
      <div className="glass p-8 rounded-2xl text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-lg font-semibold text-gray-700 mb-2">GPS Tracking Not Enabled</p>
        <p className="text-sm text-gray-500">
          The driver has not enabled real-time GPS tracking for this load.
        </p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Real-Time GPS Tracking</h3>
            <p className="text-sm text-gray-600">
              {trackingPoints.length > 0
                ? `Last update: ${new Date(trackingPoints[trackingPoints.length - 1].timestamp).toLocaleTimeString()}`
                : 'Waiting for location updates...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-700">Live</span>
          </div>
        </div>
      </div>
      <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
        {mapUrl ? (
          <iframe
            src={mapUrl}
            className="w-full h-full border-0"
            title="GPS Tracking Map"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading map...</p>
            </div>
          </div>
        )}
      </div>
      {trackingPoints.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Total Points</p>
              <p className="font-semibold text-gray-900">{trackingPoints.length}</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Latest Speed</p>
              <p className="font-semibold text-gray-900">
                {trackingPoints[trackingPoints.length - 1].speed
                  ? `${(trackingPoints[trackingPoints.length - 1].speed! * 2.237).toFixed(0)} mph`
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Accuracy</p>
              <p className="font-semibold text-gray-900">
                {trackingPoints[trackingPoints.length - 1].accuracy
                  ? `${trackingPoints[trackingPoints.length - 1].accuracy!.toFixed(0)}m`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

