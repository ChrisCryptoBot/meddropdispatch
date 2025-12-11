'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SavedFacilitiesPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [facilities, setFacilities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    const parsed = JSON.parse(shipperData)
    setShipper(parsed)
    fetchFacilities(parsed.id)
  }, [router])

  const fetchFacilities = async (shipperId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/shippers/${shipperId}/facilities`)
      if (response.ok) {
        const data = await response.json()
        setFacilities(data.facilities || [])
      }
    } catch (error) {
      console.error('Error fetching facilities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading facilities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Saved Facilities</h1>
        <p className="text-gray-600">Manage your frequently used pickup and delivery locations</p>
      </div>

      {facilities.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No saved facilities yet</h3>
          <p className="text-gray-600 mb-6">
            Facilities you use frequently will appear here for quick access when creating load requests
          </p>
          <p className="text-sm text-gray-500">
            Facilities are automatically saved when you create load requests
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <div key={facility.id} className="glass rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">{facility.name}</h3>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {facility.facilityType.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600 mb-4">
                <p>{facility.addressLine1}</p>
                {facility.addressLine2 && <p>{facility.addressLine2}</p>}
                <p>
                  {facility.city}, {facility.state} {facility.postalCode}
                </p>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-xs text-gray-500 mb-1">
                  <span className="font-medium">Contact:</span> {facility.contactName}
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Phone:</span> {facility.contactPhone}
                </p>
                {facility.defaultAccessNotes && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    {facility.defaultAccessNotes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

