'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { showToast, showApiError } from '@/lib/toast'

export default function SettingsPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'account'>('profile')
  const initialFormDataRef = useRef<any>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
  })

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailLoadUpdates: true,
    emailStatusChanges: true,
    emailDocumentUploads: true,
    emailInvoiceReady: true,
    inAppNotifications: true,
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
        // Load shipper details
        fetchShipperDetails(data.user.id)
      } catch (error) {
        console.error('Error fetching shipper data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchShipperData()
  }, [])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const fetchShipperDetails = async (shipperId: string) => {
    try {
      const response = await fetch(`/api/shippers/${shipperId}`)
      if (response.ok) {
        const data = await response.json()
        setShipper(data.shipper)
        const initialData = {
          companyName: data.shipper.companyName || '',
          contactName: data.shipper.contactName || '',
          email: data.shipper.email || '',
          phone: data.shipper.phone || '',
        }
        setFormData(initialData)
        initialFormDataRef.current = initialData
        
        // Load notification preferences from localStorage (will be migrated to DB later)
        const savedPrefs = localStorage.getItem(`shipper_${shipperId}_notifications`)
        if (savedPrefs) {
          try {
            setNotificationPrefs(JSON.parse(savedPrefs))
          } catch {
            // Use defaults if parse fails
          }
        }
      }
    } catch (error) {
      console.error('Error fetching shipper details:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const handleFormChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    setHasUnsavedChanges(true)
  }

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationPrefs({ ...notificationPrefs, [field]: value })
    setHasUnsavedChanges(true)
  }

  const validateForm = () => {
    const errors: string[] = []
    
    if (!formData.companyName.trim()) {
      errors.push('Company name is required')
    }
    
    if (!formData.contactName.trim()) {
      errors.push('Contact name is required')
    }
    
    if (!formData.email.trim()) {
      errors.push('Email is required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Please enter a valid email address')
    }
    
    if (!formData.phone.trim()) {
      errors.push('Phone number is required')
    } else if (!/^[\d\s\-\(\)\+]+$/.test(formData.phone)) {
      errors.push('Please enter a valid phone number')
    }
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (errors.length > 0) {
      showToast.error(errors[0])
      return
    }
    
    setIsSaving(true)
    
    try {
      // Update profile information via API
      const response = await fetch(`/api/shippers/${shipper?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setShipper(data.shipper)
        localStorage.setItem('shipper', JSON.stringify(data.shipper))
        
        // Save notification preferences to localStorage (will be migrated to DB later)
        if (shipper?.id) {
          localStorage.setItem(`shipper_${shipper.id}_notifications`, JSON.stringify(notificationPrefs))
        }
        
        initialFormDataRef.current = { ...formData }
        setHasUnsavedChanges(false)
        showToast.success('Settings updated successfully!')
      } else {
        const error = await response.json()
        showToast.error(error.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      showToast.error('An error occurred while updating settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!shipper || !deletePassword) {
      setPasswordError('Password is required')
      return
    }

    setIsDeleting(true)
    setPasswordError(null)
    
    try {
      // First verify the password
      const verifyResponse = await fetch('/api/auth/shipper/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipperId: shipper.id,
          password: deletePassword,
        }),
      })

      if (!verifyResponse.ok) {
        setPasswordError('Incorrect password. Please try again.')
        setIsDeleting(false)
        return
      }

      // Password verified, proceed with deletion
      const response = await fetch(`/api/shippers/${shipper.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete account')
      }

      // Clear local storage and redirect
      localStorage.removeItem('shipper')
      localStorage.removeItem(`shipper_${shipper.id}_notifications`)
      showToast.success('Account deleted successfully')
      router.push('/shipper/login')
    } catch (error) {
      if (error instanceof Error && error.message.includes('password')) {
        setPasswordError(error.message)
      } else {
        showApiError(error, 'Failed to delete account')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight print:text-2xl">Account Settings</h1>
            <p className="text-slate-400 text-sm md:text-base print:text-sm">Manage your company information and preferences</p>
          </div>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-semibold text-yellow-400">Unsaved changes</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 ${
            activeTab === 'profile'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-cyan-400'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 ${
            activeTab === 'notifications'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-cyan-400'
          }`}
        >
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`px-6 py-3 font-semibold transition-all border-b-2 ${
            activeTab === 'account'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-cyan-400'
          }`}
        >
          Account
        </button>
      </div>

      <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="glass-primary rounded-xl p-6 space-y-6 border border-slate-700/50 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Company Information</h2>
                <Link
                  href="/shipper/security"
                  className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Change Password
                </Link>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleFormChange('companyName', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => handleFormChange('contactName', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 transition-all"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  This email will be used for account notifications and login
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 transition-all"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Primary contact number for dispatch and drivers
                </p>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="glass-primary rounded-xl p-6 space-y-6 border border-slate-700/50 shadow-lg">
              <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
              <p className="text-sm text-slate-400 mb-4">
                Choose how you want to be notified about your loads and account activity
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Email: Load Updates</h3>
                    <p className="text-sm text-slate-400">Receive emails when new loads are created or updated</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.emailLoadUpdates}
                      onChange={(e) => handleNotificationChange('emailLoadUpdates', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600/50 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Email: Status Changes</h3>
                    <p className="text-sm text-slate-400">Get notified when load status changes (picked up, in transit, delivered)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.emailStatusChanges}
                      onChange={(e) => handleNotificationChange('emailStatusChanges', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600/50 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Email: Document Uploads</h3>
                    <p className="text-sm text-slate-400">Receive emails when drivers upload documents (POD, BOL, etc.)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.emailDocumentUploads}
                      onChange={(e) => handleNotificationChange('emailDocumentUploads', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600/50 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Email: Invoice Ready</h3>
                    <p className="text-sm text-slate-400">Get notified when invoices are generated and ready for payment</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.emailInvoiceReady}
                      onChange={(e) => handleNotificationChange('emailInvoiceReady', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600/50 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">In-App Notifications</h3>
                    <p className="text-sm text-slate-400">Show notifications in your dashboard and notification center</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.inAppNotifications}
                      onChange={(e) => handleNotificationChange('inAppNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600/50 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4">Account Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-400">Account Status</label>
                    <div className="mt-1">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        shipper?.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                      }`}>
                        {shipper?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-400">Member Since</label>
                    <p className="text-lg text-white font-medium mt-1">
                      {shipper?.createdAt ? new Date(shipper.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-400">Last Updated</label>
                    <p className="text-lg text-white font-medium mt-1">
                      {shipper?.updatedAt ? new Date(shipper.updatedAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {activeTab !== 'account' && (
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSaving || !hasUnsavedChanges}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (initialFormDataRef.current) {
                    setFormData(initialFormDataRef.current)
                    setHasUnsavedChanges(false)
                  }
                  router.back()
                }}
                className="px-6 py-3 bg-slate-700/50 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 transition-colors border border-slate-600/50"
              >
                Cancel
              </button>
            </div>
          )}
        </form>

        {/* Delete Account Section - Only show in Account tab */}
        {activeTab === 'account' && (
          <div className="mt-12 glass-primary rounded-xl p-6 border border-red-500/30 shadow-lg">
            {!showDeleteConfirm ? (
              <div className="space-y-4">
                <p className="text-lg font-semibold text-white">Do you want to delete your account?</p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-semibold hover:bg-red-500/30 transition-colors"
                  >
                    Yes, Delete Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-6 py-3 bg-slate-700/50 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 transition-colors border border-slate-600/50"
                  >
                    No, Keep Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-lg font-semibold text-white mb-2">Please enter your current password to confirm</p>
                
                {passwordError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">{passwordError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value)
                      setPasswordError(null)
                    }}
                    className="w-full px-4 py-3 rounded-lg border border-red-500/30 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 transition-all"
                    placeholder="Enter your password"
                    autoFocus
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || !deletePassword}
                    className="px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeletePassword('')
                      setPasswordError(null)
                    }}
                    disabled={isDeleting}
                    className="px-6 py-3 bg-slate-700/50 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 border border-slate-600/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

