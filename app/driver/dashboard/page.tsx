'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDateTime, formatDate } from '@/lib/utils'
import { LOAD_STATUS_COLORS, LOAD_STATUS_LABELS } from '@/lib/types'

interface Driver {
  id: string
  firstName: string
  lastName: string
  email: string
  status: string
  vehicleType: string
  vehiclePlate: string
}

interface Load {
  id: string
  publicTrackingCode: string
  status: string
  serviceType: string
  pickupFacility: {
    name: string
    city: string
    state: string
    addressLine1: string
    contactPhone: string
  }
  dropoffFacility: {
    name: string
    city: string
    state: string
    addressLine1: string
    contactPhone: string
  }
  readyTime?: string
  deliveryDeadline?: string
  commodityDescription: string
  temperatureRequirement: string
  estimatedContainers?: number
}

export default function DriverDashboardPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [loads, setLoads] = useState<Load[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if driver is logged in
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsedDriver = JSON.parse(driverData)
    setDriver(parsedDriver)

    // Fetch assigned loads
    fetchLoads(parsedDriver.id)
  }, [router])

  const fetchLoads = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/loads`)
      if (!response.ok) throw new Error('Failed to fetch loads')
      const data = await response.json()
      setLoads(data.loads)
    } catch (error) {
      console.error('Error fetching loads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('driver')
    router.push('/driver/login')
  }

  if (!driver) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 pb-20">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/30">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">MED DROP</h1>
                <p className="text-xs text-gray-600">Driver Portal</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-white/40 transition-base"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Driver Info Card */}
        <div className="glass p-6 rounded-2xl mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {driver.firstName} {driver.lastName}
              </h2>
              <p className="text-gray-600">{driver.vehicleType} • {driver.vehiclePlate}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              {driver.status}
            </span>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-700">{loads.length}</p>
              <p className="text-xs text-gray-600">Assigned Loads</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent-700">
                {loads.filter(l => l.status === 'SCHEDULED' || l.status === 'PICKED_UP' || l.status === 'IN_TRANSIT').length}
              </p>
              <p className="text-xs text-gray-600">Active Today</p>
            </div>
          </div>
        </div>

        {/* Loads List */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Your Assigned Loads</h3>

          {isLoading ? (
            <div className="glass p-8 rounded-2xl text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading loads...</p>
            </div>
          ) : loads.length === 0 ? (
            <div className="glass p-8 rounded-2xl text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-lg font-medium text-gray-700 mb-2">No assigned loads</p>
              <p className="text-sm text-gray-500">Check back later for new assignments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {loads.map((load) => (
                <Link
                  key={load.id}
                  href={`/driver/loads/${load.id}`}
                  className="block glass p-5 rounded-2xl hover:bg-white/60 transition-base"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono font-bold text-primary-700 text-lg">
                        {load.publicTrackingCode}
                      </p>
                      <p className="text-sm text-gray-600">{load.serviceType.replace(/_/g, ' ')}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${LOAD_STATUS_COLORS[load.status as keyof typeof LOAD_STATUS_COLORS]}`}>
                      {LOAD_STATUS_LABELS[load.status as keyof typeof LOAD_STATUS_LABELS]}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{load.pickupFacility.name}</p>
                        <p className="text-sm text-gray-600 truncate">{load.pickupFacility.city}, {load.pickupFacility.state}</p>
                        {load.readyTime && (
                          <p className="text-xs text-gray-500 mt-1">Ready: {formatDateTime(load.readyTime)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-4">
                      <div className="w-0.5 h-6 bg-gray-300"></div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{load.dropoffFacility.name}</p>
                        <p className="text-sm text-gray-600 truncate">{load.dropoffFacility.city}, {load.dropoffFacility.state}</p>
                        {load.deliveryDeadline && (
                          <p className="text-xs text-gray-500 mt-1">Deadline: {formatDateTime(load.deliveryDeadline)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cargo Info */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        {load.estimatedContainers || 'N/A'} containers
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                        </svg>
                        {load.temperatureRequirement}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-end mt-3">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
