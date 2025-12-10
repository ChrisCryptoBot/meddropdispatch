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

    setShipper(JSON.parse(shipperData))
    // TODO: Fetch saved facilities from API
    // For now, show placeholder
    setIsLoading(false)
  }, [router])

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
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <div key={facility.id} className="glass rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{facility.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{facility.addressLine1}</p>
              <p className="text-sm text-gray-600">
                {facility.city}, {facility.state} {facility.zipCode}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

