'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { showToast, showApiError } from '@/lib/toast'

interface Facility {
  id: string
  name: string
  facilityType: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  postalCode: string
  contactName: string
  contactPhone: string
  defaultAccessNotes: string | null
  createdAt: string
}

interface Shipper {
  id: string
  companyName: string
  shipperCode: string | null
  clientType: string
  contactName: string
  phone: string
  email: string
  isActive: boolean
  paymentTerms: string
  billingContactName: string | null
  billingContactEmail: string | null
  billingAddressLine1: string | null
  billingAddressLine2: string | null
  billingCity: string | null
  billingState: string | null
  billingPostalCode: string | null
  stripeCustomerId: string | null
  smsNotificationsEnabled: boolean
  smsPhoneNumber: string | null
  deletedAt: string | null
  deletedBy: string | null
  deletedReason: string | null
  createdAt: string
  updatedAt: string
  facilities: Facility[]
  _count: {
    loadRequests: number
    facilities: number
  }
}

export default function ShipperProfilePage() {
  const router = useRouter()
  const params = useParams()
  const shipperId = params?.id as string

  const [driver, setDriver] = useState<any>(null)
  const [shipper, setShipper] = useState<Shipper | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'facilities' | 'settings' | 'loads'>('overview')
  const [loads, setLoads] = useState<any[]>([])
  const [isLoadingLoads, setIsLoadingLoads] = useState(false)
  const [isMarkingDNU, setIsMarkingDNU] = useState(false)
  const [showDNUPasswordInput, setShowDNUPasswordInput] = useState(false)
  const [dnuPassword, setDNUPassword] = useState('')
  const [dnuPasswordError, setDNUPasswordError] = useState('')

  const [formData, setFormData] = useState({
    companyName: '',
    shipperCode: '',
    clientType: '',
    contactName: '',
    phone: '',
    email: '',
    paymentTerms: '',
    billingContactName: '',
    billingContactEmail: '',
    billingAddressLine1: '',
    billingAddressLine2: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
    smsNotificationsEnabled: false,
    smsPhoneNumber: '',
  })

  useEffect(() => {
    // Get driver from API auth check (httpOnly cookie) - layout handles redirects
    const fetchDriverData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'driver') {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        setDriver(data.user)
        
        if (shipperId) {
          fetchShipper(shipperId)
        }
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [shipperId])

  useEffect(() => {
    if (activeTab === 'loads' && shipperId && !loads.length) {
      fetchLoads(shipperId)
    }
  }, [activeTab, shipperId])

  const fetchShipper = async (id: string) => {
    try {
      const response = await fetch(`/api/shippers/${id}`)
      if (!response.ok) throw new Error('Failed to fetch shipper')

      const data = await response.json()
      setShipper(data.shipper)
      setFormData({
        companyName: data.shipper.companyName || '',
        shipperCode: data.shipper.shipperCode || '',
        clientType: data.shipper.clientType || '',
        contactName: data.shipper.contactName || '',
        phone: data.shipper.phone || '',
        email: data.shipper.email || '',
        paymentTerms: data.shipper.paymentTerms || 'NET_14',
        billingContactName: data.shipper.billingContactName || '',
        billingContactEmail: data.shipper.billingContactEmail || '',
        billingAddressLine1: data.shipper.billingAddressLine1 || '',
        billingAddressLine2: data.shipper.billingAddressLine2 || '',
        billingCity: data.shipper.billingCity || '',
        billingState: data.shipper.billingState || '',
        billingPostalCode: data.shipper.billingPostalCode || '',
        smsNotificationsEnabled: data.shipper.smsNotificationsEnabled ?? true,
        smsPhoneNumber: data.shipper.smsPhoneNumber || '',
      })
    } catch (error) {
      console.error('Error fetching shipper:', error)
      showApiError(error, 'Failed to load shipper profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/shippers/${shipperId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          contactName: formData.contactName,
          phone: formData.phone,
          email: formData.email,
          paymentTerms: formData.paymentTerms,
          billingContactName: formData.billingContactName || null,
          billingContactEmail: formData.billingContactEmail || null,
          billingAddressLine1: formData.billingAddressLine1 || null,
          billingAddressLine2: formData.billingAddressLine2 || null,
          billingCity: formData.billingCity || null,
          billingState: formData.billingState || null,
          billingPostalCode: formData.billingPostalCode || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update shipper')
      }

      showToast.success('Shipper profile updated successfully')
      setIsEditing(false)
      await fetchShipper(shipperId)
    } catch (error) {
      console.error('Error updating shipper:', error)
      showApiError(error, 'Failed to update shipper profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (shipper) {
      setFormData({
        companyName: shipper.companyName || '',
        shipperCode: shipper.shipperCode || '',
        clientType: shipper.clientType || '',
        contactName: shipper.contactName || '',
        phone: shipper.phone || '',
        email: shipper.email || '',
        paymentTerms: shipper.paymentTerms || 'NET_14',
        billingContactName: shipper.billingContactName || '',
        billingContactEmail: shipper.billingContactEmail || '',
        billingAddressLine1: shipper.billingAddressLine1 || '',
        billingAddressLine2: shipper.billingAddressLine2 || '',
        billingCity: shipper.billingCity || '',
        billingState: shipper.billingState || '',
        billingPostalCode: shipper.billingPostalCode || '',
        smsNotificationsEnabled: shipper.smsNotificationsEnabled ?? true,
        smsPhoneNumber: shipper.smsPhoneNumber || '',
      })
    }
    setIsEditing(false)
  }

  const fetchLoads = async (id: string) => {
    setIsLoadingLoads(true)
    try {
      const response = await fetch(`/api/load-requests?shipperId=${id}`)
      if (!response.ok) throw new Error('Failed to fetch loads')
      const data = await response.json()
      setLoads(data.loads || [])
    } catch (error) {
      console.error('Error fetching loads:', error)
      showApiError(error, 'Failed to load shipper loads')
    } finally {
      setIsLoadingLoads(false)
    }
  }

  const handleDNU = async () => {
    if (!shipper || !driver) return

    if (!dnuPassword) {
      setDNUPasswordError('Password is required')
      return
    }

    // Verify password first
    try {
      const verifyResponse = await fetch('/api/auth/driver/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          password: dnuPassword,
        }),
      })

      if (!verifyResponse.ok) {
        setDNUPasswordError('Invalid password')
        return
      }
    } catch (error) {
      setDNUPasswordError('Failed to verify password')
      return
    }

    const reason = prompt(`Mark ${shipper.companyName} as DNU (Do Not Use)?\n\nThis will:\n- Deactivate the account\n- Block the email from future signups\n\nAdmins can restore this account later if needed.\n\nEnter reason (optional):`)
    
    if (reason === null) return // User cancelled

    setIsMarkingDNU(true)
    setDNUPasswordError('')
    try {
      const response = await fetch(`/api/shippers/${shipperId}/dnu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason || `DNU: ${shipper.companyName}`,
          blockEmail: true,
          password: dnuPassword,
          driverId: driver.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.message?.includes('password') || error.message?.includes('Password')) {
          setDNUPasswordError(error.message)
        } else {
          throw new Error(error.message || 'Failed to mark shipper as DNU')
        }
        return
      }

      showToast.success('Shipper marked as DNU. Email has been blocked. Admins can restore this account later if needed.')
      router.push('/driver/shippers')
    } catch (error) {
      console.error('Error marking shipper as DNU:', error)
      showApiError(error, 'Failed to mark shipper as DNU')
    } finally {
      setIsMarkingDNU(false)
      setDNUPassword('')
      setShowDNUPasswordInput(false)
    }
  }

  if (!driver) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                  <p className="text-slate-300">Loading shipper profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!shipper) {
    return (
      <div className="p-8">
        <div className="glass-primary p-12 rounded-xl text-center border border-slate-700/50 shadow-lg">
          <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">Shipper Not Found</h3>
          <p className="text-slate-400 mb-4">The shipper profile you're looking for doesn't exist.</p>
          <Link
            href="/driver/shippers"
            className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:shadow-xl hover:shadow-cyan-500/50 transition-all font-semibold shadow-lg shadow-cyan-500/30"
          >
            Back to Shippers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[100px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center gap-4">
          <Link
            href="/driver/shippers"
            className="text-slate-300 hover:text-cyan-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">{shipper.companyName}</h1>
            <p className="text-slate-400">
              {shipper.clientType.replace(/_/g, ' ')} • {shipper.isActive ? (
                <span className="text-green-400 font-semibold">Active</span>
              ) : (
                <span className="text-slate-500 font-semibold">Inactive</span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:shadow-xl hover:shadow-cyan-500/50 transition-all font-semibold shadow-lg shadow-cyan-500/30"
                >
                  Edit Profile
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-6 py-3 bg-slate-700/50 text-slate-200 rounded-lg hover:bg-slate-700 transition-all font-semibold disabled:opacity-50 border border-slate-600/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:shadow-xl hover:shadow-cyan-500/50 transition-all font-semibold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-cyan-500/30"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-slate-700/50">
            {(['overview', 'billing', 'facilities', 'loads', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? 'text-cyan-400 border-b-2 border-cyan-500'
                    : 'text-slate-400 hover:text-cyan-400'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Company Information */}
            <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-6">Company Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Company Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                    />
                  ) : (
                    <p className="text-white font-medium">{shipper.companyName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Shipper Code</label>
                  <p className="text-white font-medium">{shipper.shipperCode || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Client Type</label>
                  <p className="text-white font-medium">{shipper.clientType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${
                    shipper.isActive
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-slate-700/50 text-slate-300 border-slate-600/50'
                  }`}>
                    {shipper.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Contact Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                    />
                  ) : (
                    <p className="text-white font-medium">{shipper.contactName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                    />
                  ) : (
                    <a href={`tel:${shipper.phone}`} className="text-cyan-400 hover:text-cyan-300 font-medium">
                      {shipper.phone}
                    </a>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                    />
                  ) : (
                    <a href={`mailto:${shipper.email}`} className="text-cyan-400 hover:text-cyan-300 font-medium">
                      {shipper.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
                <p className="text-sm text-slate-400 mb-2">Total Loads</p>
                <p className="text-3xl font-bold text-white font-data">{shipper._count.loadRequests}</p>
              </div>
              <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
                <p className="text-sm text-slate-400 mb-2">Facilities</p>
                <p className="text-3xl font-bold text-white font-data">{shipper._count.facilities}</p>
              </div>
              <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
                <p className="text-sm text-slate-400 mb-2">Account Created</p>
                <p className="text-lg font-bold text-white font-data">{formatDate(shipper.createdAt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-6">Billing Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Payment Terms</label>
                  {isEditing ? (
                    <select
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                    >
                      <option value="NET_7">Net 7</option>
                      <option value="NET_14">Net 14</option>
                      <option value="NET_30">Net 30</option>
                      <option value="INVOICE_ONLY">Invoice Only</option>
                    </select>
                  ) : (
                    <p className="text-white font-medium">{shipper.paymentTerms.replace(/_/g, ' ')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Stripe Customer ID</label>
                  <p className="text-white font-medium">{shipper.stripeCustomerId || 'Not connected'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Billing Contact Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingContactName}
                      onChange={(e) => setFormData({ ...formData, billingContactName: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-white font-medium">{shipper.billingContactName || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Billing Contact Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.billingContactEmail}
                      onChange={(e) => setFormData({ ...formData, billingContactEmail: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-white font-medium">
                      {shipper.billingContactEmail ? (
                        <a href={`mailto:${shipper.billingContactEmail}`} className="text-cyan-400 hover:text-cyan-300">
                          {shipper.billingContactEmail}
                        </a>
                      ) : (
                        'Not set'
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Billing Address Line 1</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingAddressLine1}
                      onChange={(e) => setFormData({ ...formData, billingAddressLine1: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-white font-medium">{shipper.billingAddressLine1 || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Billing Address Line 2</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingAddressLine2}
                      onChange={(e) => setFormData({ ...formData, billingAddressLine2: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-white font-medium">{shipper.billingAddressLine2 || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Billing City</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingCity}
                      onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-white font-medium">{shipper.billingCity || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Billing State</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingState}
                      onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-white font-medium">{shipper.billingState || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Billing Postal Code</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingPostalCode}
                      onChange={(e) => setFormData({ ...formData, billingPostalCode: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-white font-medium">{shipper.billingPostalCode || 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Facilities Tab */}
        {activeTab === 'facilities' && (
          <div className="space-y-6">
            <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Facilities ({shipper.facilities.length})</h2>
              </div>
              {shipper.facilities.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-slate-400">No facilities registered for this shipper</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {shipper.facilities.map((facility) => (
                    <div key={facility.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">{facility.name}</h3>
                          <p className="text-sm text-slate-400">{facility.facilityType.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400 mb-1">Address</p>
                          <p className="text-white font-medium">
                            {facility.addressLine1}
                            {facility.addressLine2 && `, ${facility.addressLine2}`}
                            <br />
                            {facility.city}, {facility.state} {facility.postalCode}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-1">Contact</p>
                          <p className="text-white font-medium">{facility.contactName}</p>
                          <a href={`tel:${facility.contactPhone}`} className="text-cyan-400 hover:text-cyan-300">
                            {facility.contactPhone}
                          </a>
                        </div>
                        {facility.defaultAccessNotes && (
                          <div className="md:col-span-2">
                            <p className="text-slate-400 mb-1">Access Notes</p>
                            <p className="text-white">{facility.defaultAccessNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loads Tab */}
        {activeTab === 'loads' && (
          <div className="space-y-6">
            <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Loads ({loads.length})</h2>
              </div>
              {isLoadingLoads ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                  <p className="text-slate-300">Loading loads...</p>
                </div>
              ) : loads.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-slate-400">No loads found for this shipper</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {loads.map((load) => (
                    <Link
                      key={load.id}
                      href={`/driver/loads/${load.id}`}
                      className="block p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600/50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-white">{load.trackingCode}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              load.status === 'DELIVERED' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              load.status === 'IN_TRANSIT' || load.status === 'PICKED_UP' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' :
                              load.status === 'DENIED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              'bg-slate-700/50 text-slate-300 border-slate-600/50'
                            }`}>
                              {load.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-400">
                            <div>
                              <span className="font-semibold">Pickup:</span> {load.pickupAddressLine1}, {load.pickupCity}, {load.pickupState}
                            </div>
                            <div>
                              <span className="font-semibold">Delivery:</span> {load.dropoffAddressLine1}, {load.dropoffCity}, {load.dropoffState}
                            </div>
                            {load.createdAt && (
                              <div>
                                <span className="font-semibold">Created:</span> {formatDate(load.createdAt)}
                              </div>
                            )}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
              <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">SMS Notifications</label>
                  <p className="text-white font-medium">
                    {shipper.smsNotificationsEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">SMS Phone Number</label>
                  <p className="text-white font-medium">
                    {shipper.smsPhoneNumber ? (
                      <a href={`tel:${shipper.smsPhoneNumber}`} className="text-cyan-400 hover:text-cyan-300">
                        {shipper.smsPhoneNumber}
                      </a>
                    ) : (
                      'Not set'
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Account Created</label>
                  <p className="text-white font-medium">{formatDate(shipper.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Last Updated</label>
                  <p className="text-white font-medium">{formatDate(shipper.updatedAt)}</p>
                </div>
                {shipper.deletedAt && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Deleted At</label>
                      <p className="text-white font-medium">{formatDate(shipper.deletedAt)}</p>
                    </div>
                    {shipper.deletedReason && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Deletion Reason</label>
                        <p className="text-white font-medium">{shipper.deletedReason}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Mark as DNU */}
            <div className="glass-primary p-6 rounded-xl border border-red-500/30 shadow-lg">
              <h2 className="text-xl font-bold text-red-400 mb-2">Mark as DNU (Do Not Use)</h2>
              <p className="text-slate-300 mb-4">
                Mark this shipper as DNU. This will deactivate the account and block the email from future signups. Admins can restore this account later if needed.
              </p>
              {!showDNUPasswordInput ? (
                <button
                  onClick={() => setShowDNUPasswordInput(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Mark as DNU
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Enter your password to confirm
                    </label>
                    <input
                      type="password"
                      value={dnuPassword}
                      onChange={(e) => setDNUPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                      placeholder="Your password"
                      autoComplete="current-password"
                    />
                    {dnuPasswordError && (
                      <p className="mt-1 text-sm text-red-400">{dnuPasswordError}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDNU}
                      disabled={isMarkingDNU || !dnuPassword}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isMarkingDNU ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          Confirm Mark as DNU
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowDNUPasswordInput(false)
                        setDNUPassword('')
                        setDNUPasswordError('')
                      }}
                      disabled={isMarkingDNU}
                      className="px-6 py-3 bg-slate-700/50 text-slate-200 rounded-lg hover:bg-slate-700 transition-all font-semibold disabled:opacity-50 border border-slate-600/50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


