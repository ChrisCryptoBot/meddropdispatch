'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Shipper {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string
  clientType: string
}

export default function ShipperProfilePage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<Shipper | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    const parsedShipper = JSON.parse(shipperData)
    setShipper(parsedShipper)
    setIsLoading(false)
  }, [router])

  if (isLoading || !shipper) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">My Profile</h1>

      <div className="glass p-6 rounded-2xl max-w-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Company Information</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Company Name</label>
            <p className="text-lg text-gray-900">{shipper.companyName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Contact Name</label>
            <p className="text-lg text-gray-900">{shipper.contactName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <p className="text-lg text-gray-900">{shipper.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Phone</label>
            <p className="text-lg text-gray-900">{shipper.phone}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Business Type</label>
            <p className="text-lg text-gray-900">{shipper.clientType.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

