'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { showToast, showApiError } from '@/lib/toast'

export default function DriverSettingsPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deletePasswordError, setDeletePasswordError] = useState('')
  
  // Notification preferences
  const [notificationPreferences, setNotificationPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    loadUpdates: true,
    paymentUpdates: true,
    systemUpdates: true,
  })
  
  // Admin toggle state
  const [adminModeEnabled, setAdminModeEnabled] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [showAdminPasswordInput, setShowAdminPasswordInput] = useState(false)
  const [adminPasswordError, setAdminPasswordError] = useState('')

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
        fetchDriverDetails(data.user.id)
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  const fetchDriverDetails = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}`)
      if (response.ok) {
        const data = await response.json()
        const driverData = data.driver
        setDriver(driverData)
        // Check if admin mode is enabled in localStorage
        const adminMode = localStorage.getItem('driverAdminMode') === 'true'
        setAdminModeEnabled(adminMode && driverData.isAdmin)
        
        // Load notification preferences from localStorage (or defaults)
        const savedPrefs = localStorage.getItem('driverNotificationPreferences')
        if (savedPrefs) {
          try {
            setNotificationPreferences(JSON.parse(savedPrefs))
          } catch (e) {
            console.error('Error parsing notification preferences:', e)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching driver details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationPreferencesSave = () => {
    localStorage.setItem('driverNotificationPreferences', JSON.stringify(notificationPreferences))
    showToast.success('Notification preferences saved!')
  }

  const handleDeleteAccount = async () => {
    if (!driver) return

    if (!deletePassword) {
      setDeletePasswordError('Password is required')
      return
    }

    // Verify password first
    try {
      const verifyResponse = await fetch('/api/auth/driver/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          password: deletePassword,
        }),
      })

      if (!verifyResponse.ok) {
        setDeletePasswordError('Invalid password')
        return
      }
    } catch (error) {
      setDeletePasswordError('Failed to verify password')
      return
    }

    setIsDeleting(true)
    setDeletePasswordError('')
    try {
      const response = await fetch(`/api/drivers/${driver.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          driverId: driver.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.message?.includes('password') || error.message?.includes('Password')) {
          setDeletePasswordError(error.message)
        } else {
          throw new Error(error.message || 'Failed to deactivate account')
        }
        return
      }

      // Clear local storage and redirect
      localStorage.removeItem('driver')
      showToast.success('Account deactivated successfully. Admins can restore your account later if needed.')
      router.push('/driver/login')
    } catch (error) {
      showApiError(error, 'Failed to deactivate account')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setDeletePassword('')
    }
  }

  const handleAdminToggle = () => {
    if (!driver?.isAdmin) {
      showToast.error('You do not have admin privileges')
      return
    }

    if (!adminModeEnabled) {
      // Enabling admin mode - require password
      setShowAdminPasswordInput(true)
      setAdminPassword('')
      setAdminPasswordError('')
    } else {
      // Disabling admin mode - no password needed
      setAdminModeEnabled(false)
      localStorage.setItem('driverAdminMode', 'false')
      showToast.success('Admin mode disabled')
      // Refresh page to update navigation
      window.location.reload()
    }
  }

  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAdminPasswordError('')

    if (adminPassword !== 'admin123') {
      setAdminPasswordError('Incorrect password')
      return
    }

    // Password correct - enable admin mode
    setAdminModeEnabled(true)
    setShowAdminPasswordInput(false)
    setAdminPassword('')
    localStorage.setItem('driverAdminMode', 'true')
    showToast.success('Admin mode enabled')
    // Refresh page to update navigation
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading profile settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Settings
        </h1>
        <p className="text-slate-400">Manage your account preferences and system settings</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Notification Preferences */}
        <div className="glass-primary rounded-2xl p-6 border border-slate-700/50">
          <h2 className="text-xl font-bold text-white mb-2">Notification Preferences</h2>
          <p className="text-slate-300 mb-6">
            Choose how you want to receive notifications about loads, payments, and system updates.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <div>
                <label className="text-sm font-semibold text-white">Email Notifications</label>
                <p className="text-xs text-slate-300">Receive notifications via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences.emailNotifications}
                  onChange={(e) => setNotificationPreferences({
                    ...notificationPreferences,
                    emailNotifications: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <div>
                <label className="text-sm font-semibold text-white">SMS Notifications</label>
                <p className="text-xs text-slate-300">Receive critical updates via text message</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences.smsNotifications}
                  onChange={(e) => setNotificationPreferences({
                    ...notificationPreferences,
                    smsNotifications: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <div>
                <label className="text-sm font-semibold text-white">Push Notifications</label>
                <p className="text-xs text-slate-300">Receive browser push notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPreferences.pushNotifications}
                  onChange={(e) => setNotificationPreferences({
                    ...notificationPreferences,
                    pushNotifications: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div className="pt-4 space-y-3">
              <p className="text-sm font-semibold text-slate-300 mb-2">Notification Types</p>
              
              <div className="flex items-center justify-between py-2">
                <label className="text-sm text-slate-300">Load Updates</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.loadUpdates}
                    onChange={(e) => setNotificationPreferences({
                      ...notificationPreferences,
                      loadUpdates: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <label className="text-sm text-slate-300">Payment Updates</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.paymentUpdates}
                    onChange={(e) => setNotificationPreferences({
                      ...notificationPreferences,
                      paymentUpdates: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <label className="text-sm text-slate-300">System Updates</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.systemUpdates}
                    onChange={(e) => setNotificationPreferences({
                      ...notificationPreferences,
                      systemUpdates: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700/50">
              <button
                onClick={handleNotificationPreferencesSave}
                className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-medical"
              >
                Save Notification Preferences
              </button>
            </div>
          </div>
        </div>

        {/* Admin Mode Toggle Section */}
        {driver?.isAdmin && (
          <div className="mt-8 glass-primary rounded-xl p-6 border border-cyan-500/30">
            <h2 className="text-xl font-bold text-white mb-2">Admin Access</h2>
            <p className="text-slate-300 mb-4">
              Switch between Driver and Admin views. Admin mode provides access to system-wide management features.
            </p>
            
            {!showAdminPasswordInput ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-300">Current Mode:</span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    adminModeEnabled 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                      : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
                  }`}>
                    {adminModeEnabled ? 'Admin' : 'Driver'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAdminToggle}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    adminModeEnabled
                      ? 'bg-slate-700/50 text-slate-200 hover:bg-slate-700 border border-slate-600/50'
                      : 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30'
                  }`}
                >
                  {adminModeEnabled ? 'Switch to Driver Mode' : 'Switch to Admin Mode'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Enter Admin Password *
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value)
                      setAdminPasswordError('')
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                    placeholder="Enter password"
                    autoFocus
                  />
                  {adminPasswordError && (
                    <p className="mt-1 text-sm text-red-400">{adminPasswordError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
                  >
                    Enable Admin Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminPasswordInput(false)
                      setAdminPassword('')
                      setAdminPasswordError('')
                    }}
                    className="px-6 py-2 bg-slate-700/50 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 transition-colors border border-slate-600/50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Delete Account Section */}
        <div className="mt-12 glass-primary rounded-xl p-6 border border-red-500/30">
          <h2 className="text-xl font-bold text-red-400 mb-2">Delete Account</h2>
          <p className="text-slate-300 mb-4">
            Deactivate your driver account. Your account will be marked as inactive but all data will be preserved. Admins can restore your account later if needed.
          </p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Deactivate Account
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="Your password"
                  autoComplete="current-password"
                />
                {deletePasswordError && (
                  <p className="mt-1 text-sm text-red-400">{deletePasswordError}</p>
                )}
              </div>
              <p className="text-red-400 font-semibold">
                Are you sure you want to deactivate your account?
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || !deletePassword}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deactivating...' : 'Yes, Deactivate My Account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeletePassword('')
                    setDeletePasswordError('')
                  }}
                  disabled={isDeleting}
                  className="px-6 py-3 bg-slate-700/50 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 transition-colors border border-slate-600/50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

