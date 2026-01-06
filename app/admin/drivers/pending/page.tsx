'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAdminFromStorage } from '@/lib/auth-admin'

interface PendingDriver {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  status: string
  licenseNumber: string | null
  licenseExpiry: Date | null
  vehicleType: string | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vehiclePlate: string | null
  hasRefrigeration: boolean
  un3373Certified: boolean
  createdAt: Date
  documentCount: number
}

export default function AdminPendingDriversPage() {
  const router = useRouter()
  const [drivers, setDrivers] = useState<PendingDriver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [admin, setAdmin] = useState<any>(null)

  useEffect(() => {
    // Get admin from storage
    const adminData = getAdminFromStorage()
    if (!adminData) {
      router.push('/admin/login')
      return
    }
    setAdmin(adminData)
    fetchPendingDrivers(adminData)
  }, [router])

  const fetchPendingDrivers = async (adminData: any) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/admin/drivers/pending', {
        headers: {
          'x-admin-id': adminData.id,
          'x-admin-role': adminData.role,
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to fetch pending drivers')
      }

      const data = await response.json()
      setDrivers(data.drivers || [])
    } catch (err) {
      console.error('Error fetching pending drivers:', err)
      setError(err instanceof Error ? err.message : 'Failed to load pending drivers')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pending drivers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      {/* Title Container */}
      <div className="sticky top-0 z-30 bg-gradient-medical-bg backdrop-blur-sm pt-[73px] pb-4 mb-8 print:mb-4 print:static print:pt-8 print:top-0 border-b border-blue-200/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">Driver Approvals</h1>
            <p className="text-gray-600 print:text-sm">Review and approve pending driver applications</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary-600">{drivers.length}</div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-urgent-50 border-2 border-urgent-200 rounded-xl">
          <p className="text-urgent-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {drivers.length === 0 ? (
        <div className="glass-primary rounded-2xl p-12 text-center border-2 border-blue-200/30 shadow-glass">
          <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Pending Drivers</h3>
          <p className="text-gray-600">All driver applications have been reviewed.</p>
        </div>
      ) : (
        <div className="glass-primary rounded-2xl border-2 border-blue-200/30 shadow-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50/60 border-b border-blue-200/30">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Documents</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Applied</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200/30">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">
                        {driver.firstName} {driver.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{driver.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{driver.phone}</div>
                      {driver.licenseNumber && (
                        <div className="text-xs text-gray-500">License: {driver.licenseNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {driver.vehicleType ? (
                        <div>
                          <div className="text-sm text-gray-900">{driver.vehicleType}</div>
                          {driver.vehiclePlate && (
                            <div className="text-xs text-gray-500">{driver.vehiclePlate}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          driver.documentCount > 0
                            ? 'bg-success-100 text-success-700 border border-success-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {driver.documentCount} uploaded
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(driver.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/drivers/${driver.id}`}
                        className="inline-flex items-center px-4 py-2 bg-gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-lg text-sm"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}










