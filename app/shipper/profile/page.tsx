'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ShipperProfilePage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }

    const parsedShipper = JSON.parse(shipperData)
    setShipper(parsedShipper)
    
    // Fetch full shipper details
    fetchShipperDetails(parsedShipper.id)
  }, [router])

  const fetchShipperDetails = async (shipperId: string) => {
    try {
      const response = await fetch(`/api/shippers/${shipperId}`)
      if (response.ok) {
        const data = await response.json()
        setShipper(data.shipper)
      }
    } catch (error) {
      console.error('Error fetching shipper details:', error)
    } finally {
      setIsLoading(false)
    }
  }

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

  const getClientTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600">View your company profile and account information</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        {/* Company Information */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Company Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Company Name</label>
              <p className="text-lg text-gray-900 font-medium">{shipper.companyName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Business Type</label>
              <p className="text-lg text-gray-900">{getClientTypeLabel(shipper.clientType)}</p>
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
              <label className="text-sm font-medium text-gray-600">Account Status</label>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                shipper.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {shipper.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Terms</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Payment Terms</label>
              <p className="text-lg text-gray-900">
                {shipper.paymentTerms === 'NET_7' ? 'Net 7 Days' :
                 shipper.paymentTerms === 'NET_14' ? 'Net 14 Days' :
                 shipper.paymentTerms === 'NET_30' ? 'Net 30 Days' :
                 shipper.paymentTerms === 'INVOICE_ONLY' ? 'Invoice Only' :
                 shipper.paymentTerms || 'Not set'}
              </p>
            </div>
            {shipper.billingContactName && (
              <div>
                <label className="text-sm font-medium text-gray-600">Billing Contact</label>
                <p className="text-lg text-gray-900">{shipper.billingContactName}</p>
                {shipper.billingContactEmail && (
                  <p className="text-sm text-gray-600">{shipper.billingContactEmail}</p>
                )}
              </div>
            )}
            {(shipper.billingAddressLine1 || shipper.billingCity) && (
              <div>
                <label className="text-sm font-medium text-gray-600">Billing Address</label>
                <div className="text-sm text-gray-900">
                  {shipper.billingAddressLine1 && <p>{shipper.billingAddressLine1}</p>}
                  {shipper.billingAddressLine2 && <p>{shipper.billingAddressLine2}</p>}
                  {(shipper.billingCity || shipper.billingState || shipper.billingPostalCode) && (
                    <p>
                      {[shipper.billingCity, shipper.billingState, shipper.billingPostalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Details */}
        <div className="glass p-6 rounded-2xl md:col-span-2">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Member Since</label>
              <p className="text-lg text-gray-900">
                {new Date(shipper.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Last Updated</label>
              <p className="text-lg text-gray-900">
                {new Date(shipper.updatedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass p-6 rounded-2xl md:col-span-2">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/shipper/settings"
              className="px-4 py-2 rounded-lg bg-slate-600 text-white font-semibold hover:bg-slate-700 transition-colors"
            >
              Edit Profile
            </Link>
            <Link
              href="/shipper/billing"
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
            >
              Update Billing Settings
            </Link>
            <Link
              href="/shipper/security"
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
            >
              Change Password
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
