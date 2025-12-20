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
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsed = JSON.parse(driverData)
    setDriver(parsed)
    fetchDriverDetails(parsed.id)
  }, [router])

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

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/drivers/${driver.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete account')
      }

      // Clear local storage and redirect
      localStorage.removeItem('driver')
      showToast.success('Account deleted successfully')
      router.push('/driver/login')
    } catch (error) {
      showApiError(error, 'Failed to delete account')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile settings...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      <div className="sticky top-0 z-30 bg-gradient-medical-bg backdrop-blur-sm pt-[73px] pb-4 mb-8 print:mb-4 print:static print:pt-8 print:top-0 border-b border-teal-200/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">Settings</h1>
            <p className="text-gray-600 print:text-sm">Manage your account preferences and system settings</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Notification Preferences */}
        <div className="glass rounded-2xl p-6 border-2 border-teal-200/30">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Notification Preferences</h2>
          <p className="text-gray-600 mb-6">
            Choose how you want to receive notifications about loads, payments, and system updates.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <label className="text-sm font-semibold text-gray-900">Email Notifications</label>
                <p className="text-xs text-gray-600">Receive notifications via email</p>
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <label className="text-sm font-semibold text-gray-900">SMS Notifications</label>
                <p className="text-xs text-gray-600">Receive critical updates via text message</p>
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <label className="text-sm font-semibold text-gray-900">Push Notifications</label>
                <p className="text-xs text-gray-600">Receive browser push notifications</p>
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <div className="pt-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">Notification Types</p>
              
              <div className="flex items-center justify-between py-2">
                <label className="text-sm text-gray-700">Load Updates</label>
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <label className="text-sm text-gray-700">Payment Updates</label>
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <label className="text-sm text-gray-700">System Updates</label>
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
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleNotificationPreferencesSave}
                className="px-6 py-2 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-medical"
              >
                Save Notification Preferences
              </button>
            </div>
          </div>
        </div>

        {/* Admin Mode Toggle Section */}
        {driver?.isAdmin && (
          <div className="mt-8 glass rounded-2xl p-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access</h2>
            <p className="text-gray-600 mb-4">
              Switch between Driver and Admin views. Admin mode provides access to system-wide management features.
            </p>
            
            {!showAdminPasswordInput ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Current Mode:</span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    adminModeEnabled 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-teal-100 text-teal-700'
                  }`}>
                    {adminModeEnabled ? 'Admin' : 'Driver'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAdminToggle}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    adminModeEnabled
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {adminModeEnabled ? 'Switch to Driver Mode' : 'Switch to Admin Mode'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Enter Admin Password *
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value)
                      setAdminPasswordError('')
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50/60"
                    placeholder="Enter password"
                    autoFocus
                  />
                  {adminPasswordError && (
                    <p className="mt-1 text-sm text-red-600">{adminPasswordError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Delete Account Section */}
        <div className="mt-12 glass rounded-2xl p-6 border-2 border-red-200">
          <h2 className="text-xl font-bold text-red-700 mb-2">Danger Zone</h2>
          <p className="text-gray-600 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-red-700 font-semibold">
                Are you absolutely sure? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
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
