'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Driver {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: string
  licenseNumber?: string
  licenseExpiry?: string
  vehicleType?: string
  vehicleMake?: string
  vehicleModel?: string
  vehicleYear?: number
  vehiclePlate?: string
  hasRefrigeration: boolean
  un3373Certified: boolean
  hipaaTrainingDate?: string
}

export default function DriverProfilePage() {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsedDriver = JSON.parse(driverData)
    setDriver(parsedDriver)
    setIsLoading(false)
  }, [router])

  if (isLoading || !driver) {
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Name</label>
              <p className="text-lg text-gray-900">{driver.firstName} {driver.lastName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-lg text-gray-900">{driver.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Phone</label>
              <p className="text-lg text-gray-900">{driver.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                {driver.status}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vehicle Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Vehicle Type</label>
              <p className="text-lg text-gray-900">{driver.vehicleType || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Vehicle Details</label>
              <p className="text-lg text-gray-900">
                {driver.vehicleYear && driver.vehicleMake && driver.vehicleModel
                  ? `${driver.vehicleYear} ${driver.vehicleMake} ${driver.vehicleModel}`
                  : 'Not specified'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">License Plate</label>
              <p className="text-lg text-gray-900">{driver.vehiclePlate || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Refrigeration</label>
              <p className="text-lg text-gray-900">
                {driver.hasRefrigeration ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Certifications & Training</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">UN3373 Certified</label>
              <p className="text-lg text-gray-900">
                {driver.un3373Certified ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">HIPAA Training</label>
              <p className="text-lg text-gray-900">
                {driver.hipaaTrainingDate
                  ? new Date(driver.hipaaTrainingDate).toLocaleDateString()
                  : 'Not completed'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Driver License</label>
              <p className="text-lg text-gray-900">{driver.licenseNumber || 'Not provided'}</p>
              {driver.licenseExpiry && (
                <p className="text-sm text-gray-600">
                  Expires: {new Date(driver.licenseExpiry).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

