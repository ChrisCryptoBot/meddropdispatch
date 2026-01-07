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
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading pending drivers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-0 z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 flex items-center justify-between border-b border-slate-700/50">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
            Driver Approvals
          </h1>
          <p className="text-slate-400">Review and approve pending driver applications</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white font-data">{drivers.length}</div>
          <div className="text-sm text-slate-400">Pending Review</div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {drivers.length === 0 ? (
        <div className="glass-primary rounded-xl p-12 text-center border border-slate-700/50 shadow-lg">
          <div className="w-16 h-16 text-slate-400 mx-auto mb-6">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Pending Drivers</h3>
          <p className="text-slate-400">All driver applications have been reviewed.</p>
        </div>
      ) : (
        <div className="glass-primary rounded-xl border border-slate-700/50 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Documents</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Applied</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-white">
                        {driver.firstName} {driver.lastName}
                      </div>
                      <div className="text-sm text-slate-400">{driver.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{driver.phone}</div>
                      {driver.licenseNumber && (
                        <div className="text-xs text-slate-500">License: {driver.licenseNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {driver.vehicleType ? (
                        <div>
                          <div className="text-sm text-slate-300">{driver.vehicleType}</div>
                          {driver.vehiclePlate && (
                            <div className="text-xs text-slate-500">{driver.vehiclePlate}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          driver.documentCount > 0
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                        }`}>
                          {driver.documentCount} uploaded
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDate(driver.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/drivers/${driver.id}`}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 text-sm"
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










