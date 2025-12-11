'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { showToast, showApiError } from '@/lib/toast'

interface PayoutHistoryItem {
  id: string
  payoutDate: string
  amount: number
  paymentMethod: string
  status: string
  reference?: string | null
  processedAt?: string | null
  notes?: string | null
}

export default function DriverPaymentsPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings')

  // Form state
  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'ACH',
    bankName: '',
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking', // checking or savings
    payoutFrequency: 'WEEKLY',
    minimumPayout: 100,
    minimumRatePerMile: 0,
  })

  const [taxData, setTaxData] = useState({
    taxId: '',
    taxIdType: 'SSN', // SSN or EIN
    w9Submitted: false,
  })

  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsed = JSON.parse(driverData)
    setDriver(parsed)
    
    fetchPaymentSettings(parsed.id)
    fetchPayoutHistory(parsed.id)
  }, [router])

  const fetchPayoutHistory = async (driverId: string) => {
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/drivers/${driverId}/payouts`)
      if (response.ok) {
        const data = await response.json()
        setPayoutHistory(data.payouts || [])
      }
    } catch (error) {
      console.error('Error fetching payout history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const fetchPaymentSettings = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/payment-settings`)
      if (response.ok) {
        const data = await response.json()
        const settings = data.paymentSettings
        setPaymentData({
          paymentMethod: settings.paymentMethod || 'ACH',
          bankName: settings.bankName || '',
          accountHolderName: settings.accountHolderName || '',
          routingNumber: settings.routingNumber || '',
          accountNumber: settings.accountNumber || '',
          accountType: settings.accountType || 'checking',
          payoutFrequency: settings.payoutFrequency || 'WEEKLY',
          minimumPayout: settings.minimumPayout || 100,
          minimumRatePerMile: settings.minimumRatePerMile || 0,
        })
        setTaxData({
          taxId: settings.taxId || '',
          taxIdType: settings.taxIdType || 'SSN',
          w9Submitted: settings.w9Submitted || false,
        })
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!driver) return
    
    setIsSaving(true)
    
    try {
      const response = await fetch(`/api/drivers/${driver.id}/payment-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update payment settings')
      }

      showToast.success('Payment settings updated successfully!')
    } catch (error) {
      showApiError(error, 'Failed to update payment settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTaxInfoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!driver) return
    
    setIsSaving(true)
    
    try {
      const response = await fetch(`/api/drivers/${driver.id}/payment-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxId: taxData.taxId,
          taxIdType: taxData.taxIdType,
          w9Submitted: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update tax information')
      }

      setTaxData({ ...taxData, w9Submitted: true })
      showToast.success('Tax information submitted successfully!')
    } catch (error) {
      showApiError(error, 'Failed to update tax information')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payment settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Payments & Payouts</h1>
        <p className="text-gray-600">Manage your payment method and payout preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
            activeTab === 'settings'
              ? 'border-slate-600 text-slate-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Payment Settings
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium text-sm transition-all border-b-2 ${
            activeTab === 'history'
              ? 'border-slate-600 text-slate-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Payout History
        </button>
      </div>

      {/* Payment Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Payment Method */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Payment Method</h2>
            <form onSubmit={handlePaymentSettingsSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                >
                  <option value="ACH">ACH (Bank Transfer)</option>
                  <option value="CHECK" disabled>Check (Coming Soon)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Payments are processed via ACH transfer directly to your bank account
                </p>
              </div>

              {paymentData.paymentMethod === 'ACH' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={paymentData.bankName}
                      onChange={(e) => setPaymentData({ ...paymentData, bankName: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      placeholder="Chase Bank"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      value={paymentData.accountHolderName}
                      onChange={(e) => setPaymentData({ ...paymentData, accountHolderName: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Routing Number *
                      </label>
                      <input
                        type="text"
                        value={paymentData.routingNumber}
                        onChange={(e) => setPaymentData({ ...paymentData, routingNumber: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        placeholder="123456789"
                        maxLength={9}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Account Number *
                      </label>
                      <input
                        type="password"
                        value={paymentData.accountNumber}
                        onChange={(e) => setPaymentData({ ...paymentData, accountNumber: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Account Type *
                    </label>
                    <select
                      value={paymentData.accountType}
                      onChange={(e) => setPaymentData({ ...paymentData, accountType: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      required
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Preferences</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payout Frequency *
                    </label>
                    <select
                      value={paymentData.payoutFrequency}
                      onChange={(e) => setPaymentData({ ...paymentData, payoutFrequency: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      required
                    >
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Bi-weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Minimum Payout Amount ($)
                    </label>
                    <input
                      type="number"
                      value={paymentData.minimumPayout}
                      onChange={(e) => setPaymentData({ ...paymentData, minimumPayout: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Earnings will accumulate until this amount is reached before payout
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rate Settings</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Minimum Rate Per Mile ($)
                  </label>
                  <input
                    type="number"
                    value={paymentData.minimumRatePerMile}
                    onChange={(e) => setPaymentData({ ...paymentData, minimumRatePerMile: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Set your minimum acceptable rate per mile. The rate calculator will warn you if a load's rate falls below this threshold. Leave blank or 0 to disable.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Payment Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Tax Information */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Tax Information</h2>
            <form onSubmit={handleTaxInfoSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tax ID Type *
                </label>
                <select
                  value={taxData.taxIdType}
                  onChange={(e) => setTaxData({ ...taxData, taxIdType: e.target.value, taxId: '' })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                >
                  <option value="SSN">Social Security Number (SSN)</option>
                  <option value="EIN">Employer Identification Number (EIN)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {taxData.taxIdType === 'SSN' ? 'Social Security Number' : 'EIN'} *
                </label>
                <input
                  type="text"
                  value={taxData.taxId}
                  onChange={(e) => setTaxData({ ...taxData, taxId: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder={taxData.taxIdType === 'SSN' ? 'XXX-XX-XXXX' : 'XX-XXXXXXX'}
                  maxLength={taxData.taxIdType === 'SSN' ? 9 : 9}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Required for tax reporting (Form 1099)
                </p>
              </div>

              {taxData.w9Submitted && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 font-medium">
                    ✓ Tax information submitted
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSaving || taxData.w9Submitted}
                  className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : taxData.w9Submitted ? 'Tax Info Submitted' : 'Submit Tax Information'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout History Tab */}
      {activeTab === 'history' && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Payout History</h2>
          
          {payoutHistory.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No payout history yet</h3>
              <p className="text-gray-600">
                Payout history will appear here once payments are processed
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoadingHistory ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading payout history...</p>
                </div>
              ) : (
                payoutHistory.map((payout) => (
                  <div key={payout.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-gray-900 text-lg">{formatCurrency(payout.amount)}</p>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            payout.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            payout.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                            payout.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            payout.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {payout.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            Scheduled: {formatDate(payout.payoutDate)}
                          </p>
                          {payout.processedAt && (
                            <p className="text-sm text-gray-600">
                              Processed: {formatDate(payout.processedAt)}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">via {payout.paymentMethod}</p>
                          {payout.reference && (
                            <p className="text-xs text-gray-500">Reference: {payout.reference}</p>
                          )}
                          {payout.notes && (
                            <p className="text-xs text-gray-500 italic">{payout.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
