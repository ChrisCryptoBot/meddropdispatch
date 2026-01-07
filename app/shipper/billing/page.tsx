'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { showToast, showApiError } from '@/lib/toast'

export default function ShipperBillingPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    paymentTerms: 'NET_14',
    billingContactName: '',
    billingContactEmail: '',
    billingAddressLine1: '',
    billingAddressLine2: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
  })

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
        // Load shipper details including billing info
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
        setFormData({
          paymentTerms: data.shipper.paymentTerms || 'NET_14',
          billingContactName: data.shipper.billingContactName || '',
          billingContactEmail: data.shipper.billingContactEmail || '',
          billingAddressLine1: data.shipper.billingAddressLine1 || '',
          billingAddressLine2: data.shipper.billingAddressLine2 || '',
          billingCity: data.shipper.billingCity || '',
          billingState: data.shipper.billingState || '',
          billingPostalCode: data.shipper.billingPostalCode || '',
        })
      }
    } catch (error) {
      console.error('Error fetching shipper details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const response = await fetch(`/api/shippers/${shipper?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setShipper(data.shipper)
        localStorage.setItem('shipper', JSON.stringify(data.shipper))
        showToast.success('Billing settings updated successfully!')
      } else {
        const error = await response.json()
        showToast.error(error.error || 'Failed to update billing settings')
      }
    } catch (error) {
      console.error('Error updating billing settings:', error)
      showToast.error('An error occurred while updating billing settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading billing settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">Billing & Payments</h1>
        <p className="text-slate-400">Manage your payment terms and billing information</p>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Payment Terms</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Terms *
              </label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                required
              >
                <option value="NET_7">Net 7 Days</option>
                <option value="NET_14">Net 14 Days</option>
                <option value="NET_30">Net 30 Days</option>
                <option value="INVOICE_ONLY">Invoice Only (Custom Terms)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Invoice due date will be calculated based on your payment terms
              </p>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 space-y-6">
            <div className="pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Contact (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                If different from main contact, specify who should receive invoices
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Billing Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.billingContactName}
                    onChange={(e) => setFormData({ ...formData, billingContactName: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/60"
                    placeholder="Leave blank to use main contact"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Billing Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.billingContactEmail}
                    onChange={(e) => setFormData({ ...formData, billingContactEmail: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/60"
                    placeholder="Invoices will be sent to this email"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Address (Optional)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Billing address for invoices. Leave blank to use facility address.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddressLine1}
                    onChange={(e) => setFormData({ ...formData, billingAddressLine1: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddressLine2}
                    onChange={(e) => setFormData({ ...formData, billingAddressLine2: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.billingCity}
                      onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/60"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.billingState}
                      onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/60"
                      maxLength={2}
                      placeholder="TX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.billingPostalCode}
                    onChange={(e) => setFormData({ ...formData, billingPostalCode: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/60"
                    placeholder="77001"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-lg disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

