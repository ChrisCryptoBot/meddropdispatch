'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ShipperProfilePage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get shipper from API auth check (httpOnly cookie) - layout handles redirects
    const fetchShipperData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'shipper') {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        setShipper(data.user)
        // Fetch full shipper details
        fetchShipperDetails(data.user.id)
      } catch (error) {
        console.error('Error fetching shipper data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchShipperData()
  }, [])

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading profile...</p>
        </div>
      </div>
    )
  }

  const getClientTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="p-8 print:p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 print:text-2xl">My Profile</h1>
            <p className="text-slate-400 text-sm md:text-base print:text-sm">View your company profile and account information</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        {/* Company Information */}
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Company Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-400">Company Name</label>
              <p className="text-lg text-white font-medium">{shipper.companyName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">Business Type</label>
              <p className="text-lg text-white">{getClientTypeLabel(shipper.clientType)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">Contact Name</label>
              <p className="text-lg text-white">{shipper.contactName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">Email</label>
              <p className="text-lg text-white">{shipper.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">Phone</label>
              <p className="text-lg text-white">{shipper.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">Account Status</label>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                shipper.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
              }`}>
                {shipper.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Payment Terms</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-400">Payment Terms</label>
              <p className="text-lg text-white">
                {shipper.paymentTerms === 'NET_7' ? 'Net 7 Days' :
                 shipper.paymentTerms === 'NET_14' ? 'Net 14 Days' :
                 shipper.paymentTerms === 'NET_30' ? 'Net 30 Days' :
                 shipper.paymentTerms === 'INVOICE_ONLY' ? 'Invoice Only' :
                 shipper.paymentTerms || 'Not set'}
              </p>
            </div>
            {shipper.billingContactName && (
              <div>
                <label className="text-sm font-medium text-slate-400">Billing Contact</label>
                <p className="text-lg text-white">{shipper.billingContactName}</p>
                {shipper.billingContactEmail && (
                  <p className="text-sm text-slate-400">{shipper.billingContactEmail}</p>
                )}
              </div>
            )}
            {(shipper.billingAddressLine1 || shipper.billingCity) && (
              <div>
                <label className="text-sm font-medium text-slate-400">Billing Address</label>
                <div className="text-sm text-white">
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
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg md:col-span-2">
          <h2 className="text-xl font-bold text-white mb-4">Account Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400">Member Since</label>
              <p className="text-lg text-white">
                {new Date(shipper.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-400">Last Updated</label>
              <p className="text-lg text-white">
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
        <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg md:col-span-2">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/shipper/settings"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
            >
              Edit Profile
            </Link>
            <Link
              href="/shipper/billing"
              className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-200 font-semibold hover:bg-slate-700 transition-colors border border-slate-600/50"
            >
              Update Billing Settings
            </Link>
            <Link
              href="/shipper/security"
              className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-200 font-semibold hover:bg-slate-700 transition-colors border border-slate-600/50"
            >
              Change Password
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

