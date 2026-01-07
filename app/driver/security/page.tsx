'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DriverSecurityPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [driver, setDriver] = useState<any>(null)

  useEffect(() => {
    // Get driver from API auth check (httpOnly cookie) - layout handles redirects
    const fetchDriverData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'driver') {
          return // Layout will handle redirect
        }
        
        setDriver(data.user)
      } catch (error) {
        console.error('Error fetching driver data:', error)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!driver) {
      setError('Driver not found')
      return
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setIsSaving(true)

    try {

      // Verify current password first
      const verifyResponse = await fetch('/api/auth/driver/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driver.id,
          password: currentPassword,
        }),
      })

      if (!verifyResponse.ok) {
        throw new Error('Current password is incorrect')
      }

      // Update password
      const updateResponse = await fetch(`/api/drivers/${driver.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (!updateResponse.ok) {
        const error = await updateResponse.json()
        throw new Error(error.error || 'Failed to update password')
      }

      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Security
        </h1>
        <p className="text-slate-400">Change your password and manage security settings</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handlePasswordChange} className="space-y-6">
          <div className="glass rounded-2xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>

            {error && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">Password updated successfully!</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Password *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                required
                minLength={8}
              />
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                required
                minLength={8}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-medical disabled:opacity-50"
              >
                {isSaving ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setError(null)
                  setSuccess(false)
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
