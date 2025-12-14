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
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsedDriver = JSON.parse(driverData)
    setDriver(parsedDriver)
    
    if (shipperId) {
      fetchShipper(shipperId)
    }
  }, [router, shipperId])

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
    if (!shipper) return

    const reason = prompt(`Mark ${shipper.companyName} as DNU (Do Not Use)?\n\nThis will:\n- Permanently delete the account\n- Block the email from future signups\n\nEnter reason (optional):`)
    
    if (reason === null) return // User cancelled

    if (!confirm(`⚠️ WARNING: This will PERMANENTLY DELETE ${shipper.companyName} and BLOCK ${shipper.email} from signing up again.\n\nThis action cannot be undone. Continue?`)) {
      return
    }

    setIsMarkingDNU(true)
    try {
      const response = await fetch(`/api/shippers/${shipperId}/dnu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason || `DNU: ${shipper.companyName}`,
          blockEmail: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to mark shipper as DNU')
      }

      showToast.success('Shipper marked as DNU and deleted. Email has been blocked.')
      router.push('/driver/shippers')
    } catch (error) {
      console.error('Error marking shipper as DNU:', error)
      showApiError(error, 'Failed to mark shipper as DNU')
    } finally {
      setIsMarkingDNU(false)
    }
  }

  if (!driver) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading shipper profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!shipper) {
    return (
      <div className="p-8">
        <div className="glass-accent p-12 rounded-2xl text-center border-2 border-teal-200/30 shadow-medical">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Shipper Not Found</h3>
          <p className="text-gray-600 mb-4">The shipper profile you're looking for doesn't exist.</p>
          <Link
            href="/driver/shippers"
            className="inline-block px-6 py-3 bg-gradient-accent text-white rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            Back to Shippers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      <div className="sticky top-[73px] z-30 bg-gradient-medical-bg pt-8 pb-4 mb-8 print:mb-4 print:static print:top-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 flex-1">
            <Link
              href="/driver/shippers"
              className="text-accent-700 hover:text-accent-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">{shipper.companyName}</h1>
              <p className="text-gray-600 print:text-sm">
                {shipper.clientType.replace(/_/g, ' ')} • {shipper.isActive ? (
                  <span className="text-success-600 font-semibold">Active</span>
                ) : (
                  <span className="text-gray-500 font-semibold">Inactive</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mr-6">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-gradient-accent text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                >
                  Edit Profile
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-3 bg-gradient-accent text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 flex items-center gap-2"
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
          <div className="flex gap-2 border-b border-teal-200/30">
            {(['overview', 'billing', 'facilities', 'loads', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? 'text-accent-700 border-b-2 border-accent-600'
                    : 'text-gray-600 hover:text-accent-600'
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
            <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical">
              <h2 className="text-2xl font-bold text-accent-700 mb-6">Company Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{shipper.companyName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Shipper Code</label>
                  <p className="text-gray-900 font-medium">{shipper.shipperCode || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Client Type</label>
                  <p className="text-gray-900 font-medium">{shipper.clientType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    shipper.isActive
                      ? 'bg-success-100 text-success-700 border-2 border-success-200'
                      : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                  }`}>
                    {shipper.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical">
              <h2 className="text-2xl font-bold text-accent-700 mb-6">Contact Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{shipper.contactName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                    />
                  ) : (
                    <a href={`tel:${shipper.phone}`} className="text-accent-700 hover:text-accent-800 font-medium">
                      {shipper.phone}
                    </a>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                    />
                  ) : (
                    <a href={`mailto:${shipper.email}`} className="text-accent-700 hover:text-accent-800 font-medium">
                      {shipper.email}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="glass-accent p-6 rounded-xl border-2 border-teal-200/30 shadow-medical">
                <p className="text-sm text-gray-600 mb-2">Total Loads</p>
                <p className="text-3xl font-bold text-accent-700">{shipper._count.loadRequests}</p>
              </div>
              <div className="glass-accent p-6 rounded-xl border-2 border-teal-200/30 shadow-medical">
                <p className="text-sm text-gray-600 mb-2">Facilities</p>
                <p className="text-3xl font-bold text-accent-700">{shipper._count.facilities}</p>
              </div>
              <div className="glass-accent p-6 rounded-xl border-2 border-teal-200/30 shadow-medical">
                <p className="text-sm text-gray-600 mb-2">Account Created</p>
                <p className="text-lg font-bold text-accent-700">{formatDate(shipper.createdAt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical">
              <h2 className="text-2xl font-bold text-accent-700 mb-6">Billing Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Terms</label>
                  {isEditing ? (
                    <select
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                    >
                      <option value="NET_7">Net 7</option>
                      <option value="NET_14">Net 14</option>
                      <option value="NET_30">Net 30</option>
                      <option value="INVOICE_ONLY">Invoice Only</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 font-medium">{shipper.paymentTerms.replace(/_/g, ' ')}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stripe Customer ID</label>
                  <p className="text-gray-900 font-medium">{shipper.stripeCustomerId || 'Not connected'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Contact Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingContactName}
                      onChange={(e) => setFormData({ ...formData, billingContactName: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{shipper.billingContactName || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Contact Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.billingContactEmail}
                      onChange={(e) => setFormData({ ...formData, billingContactEmail: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {shipper.billingContactEmail ? (
                        <a href={`mailto:${shipper.billingContactEmail}`} className="text-accent-700 hover:text-accent-800">
                          {shipper.billingContactEmail}
                        </a>
                      ) : (
                        'Not set'
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Address Line 1</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingAddressLine1}
                      onChange={(e) => setFormData({ ...formData, billingAddressLine1: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{shipper.billingAddressLine1 || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Address Line 2</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingAddressLine2}
                      onChange={(e) => setFormData({ ...formData, billingAddressLine2: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{shipper.billingAddressLine2 || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Billing City</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingCity}
                      onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{shipper.billingCity || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Billing State</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingState}
                      onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{shipper.billingState || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Postal Code</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.billingPostalCode}
                      onChange={(e) => setFormData({ ...formData, billingPostalCode: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                      placeholder="Optional"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{shipper.billingPostalCode || 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Facilities Tab */}
        {activeTab === 'facilities' && (
          <div className="space-y-6">
            <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-accent-700">Facilities ({shipper.facilities.length})</h2>
              </div>
              {shipper.facilities.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-gray-600">No facilities registered for this shipper</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {shipper.facilities.map((facility) => (
                    <div key={facility.id} className="p-4 bg-teal-50/60 rounded-lg border border-teal-200/30">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{facility.name}</h3>
                          <p className="text-sm text-gray-600">{facility.facilityType.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Address</p>
                          <p className="text-gray-900 font-medium">
                            {facility.addressLine1}
                            {facility.addressLine2 && `, ${facility.addressLine2}`}
                            <br />
                            {facility.city}, {facility.state} {facility.postalCode}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Contact</p>
                          <p className="text-gray-900 font-medium">{facility.contactName}</p>
                          <a href={`tel:${facility.contactPhone}`} className="text-accent-700 hover:text-accent-800">
                            {facility.contactPhone}
                          </a>
                        </div>
                        {facility.defaultAccessNotes && (
                          <div className="md:col-span-2">
                            <p className="text-gray-600 mb-1">Access Notes</p>
                            <p className="text-gray-900">{facility.defaultAccessNotes}</p>
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
            <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-accent-700">Loads ({loads.length})</h2>
              </div>
              {isLoadingLoads ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading loads...</p>
                </div>
              ) : loads.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-600">No loads found for this shipper</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {loads.map((load) => (
                    <Link
                      key={load.id}
                      href={`/driver/loads/${load.id}`}
                      className="block p-4 bg-teal-50/60 rounded-lg border border-teal-200/30 hover:bg-teal-100/60 hover:border-teal-300/50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{load.trackingCode}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              load.status === 'DELIVERED' ? 'bg-success-100 text-success-700 border-2 border-success-200' :
                              load.status === 'IN_TRANSIT' || load.status === 'PICKED_UP' ? 'bg-primary-100 text-primary-700 border-2 border-primary-200' :
                              load.status === 'DENIED' ? 'bg-urgent-100 text-urgent-700 border-2 border-urgent-200' :
                              'bg-gray-100 text-gray-700 border-2 border-gray-200'
                            }`}>
                              {load.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
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
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical">
              <h2 className="text-2xl font-bold text-accent-700 mb-6">Account Settings</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SMS Notifications</label>
                  <p className="text-gray-900 font-medium">
                    {shipper.smsNotificationsEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SMS Phone Number</label>
                  <p className="text-gray-900 font-medium">
                    {shipper.smsPhoneNumber ? (
                      <a href={`tel:${shipper.smsPhoneNumber}`} className="text-accent-700 hover:text-accent-800">
                        {shipper.smsPhoneNumber}
                      </a>
                    ) : (
                      'Not set'
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account Created</label>
                  <p className="text-gray-900 font-medium">{formatDate(shipper.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Updated</label>
                  <p className="text-gray-900 font-medium">{formatDate(shipper.updatedAt)}</p>
                </div>
                {shipper.deletedAt && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Deleted At</label>
                      <p className="text-gray-900 font-medium">{formatDate(shipper.deletedAt)}</p>
                    </div>
                    {shipper.deletedReason && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Deletion Reason</label>
                        <p className="text-gray-900 font-medium">{shipper.deletedReason}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="glass-urgent p-6 rounded-2xl border-2 border-urgent-200/30 shadow-urgent">
              <h2 className="text-2xl font-bold text-urgent-700 mb-4">Danger Zone</h2>
              <p className="text-gray-700 mb-4">
                Mark this shipper as DNU (Do Not Use). This will permanently delete the account and block the email from future signups.
              </p>
              <button
                onClick={handleDNU}
                disabled={isMarkingDNU}
                className="px-6 py-3 bg-gradient-urgent text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    Mark as DNU (Do Not Use)
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

