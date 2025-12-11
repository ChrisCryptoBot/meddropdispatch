'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { showToast, showApiError } from '@/lib/toast'

interface Driver {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  status: string
  licenseNumber?: string
  licenseExpiry?: string
  vehicleType?: string
  vehicleMake?: string
  vehicleModel?: string
  vehicleYear?: number
  vehiclePlate?: string
  hasRefrigeration: boolean
  un3373Certified: boolean
  hipaaTrainingDate?: string
}

export default function DriverProfilePage() {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    emergencyContact: '',
    emergencyPhone: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsedDriver = JSON.parse(driverData)
    setDriver(parsedDriver)
    setFormData({
      firstName: parsedDriver.firstName || '',
      lastName: parsedDriver.lastName || '',
      email: parsedDriver.email || '',
      phone: parsedDriver.phone || '',
      licenseNumber: parsedDriver.licenseNumber || '',
      licenseExpiry: parsedDriver.licenseExpiry ? new Date(parsedDriver.licenseExpiry).toISOString().split('T')[0] : '',
      emergencyContact: parsedDriver.emergencyContact || '',
      emergencyPhone: parsedDriver.emergencyPhone || '',
    })
    setIsLoading(false)
  }, [router])

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!driver) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/drivers/${driver.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          licenseNumber: formData.licenseNumber || null,
          licenseExpiry: formData.licenseExpiry ? new Date(formData.licenseExpiry) : null,
          emergencyContact: formData.emergencyContact || null,
          emergencyPhone: formData.emergencyPhone || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update profile')
      }

      const data = await response.json()
      setDriver(data.driver)
      localStorage.setItem('driver', JSON.stringify(data.driver))
      setIsEditing(false)
      showToast.success('Profile updated successfully!')
    } catch (error) {
      showApiError(error, 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!driver) return

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast.error('Passwords do not match')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/drivers/${driver.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change password')
      }

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setIsChangingPassword(false)
      showToast.success('Password changed successfully!')
    } catch (error) {
      showApiError(error, 'Failed to change password')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !driver) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your personal information and settings</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="glass p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">License Number</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">License Expiry</label>
                <input
                  type="date"
                  value={formData.licenseExpiry}
                  onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Phone</label>
                <input
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  // Reset form data
                  setFormData({
                    firstName: driver.firstName || '',
                    lastName: driver.lastName || '',
                    email: driver.email || '',
                    phone: driver.phone || '',
                    licenseNumber: driver.licenseNumber || '',
                    licenseExpiry: driver.licenseExpiry ? new Date(driver.licenseExpiry).toISOString().split('T')[0] : '',
                    emergencyContact: driver.emergencyContact || '',
                    emergencyPhone: driver.emergencyPhone || '',
                  })
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="glass p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-lg text-gray-900">{driver.firstName} {driver.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-lg text-gray-900">{driver.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="text-lg text-gray-900">{driver.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  {driver.status}
                </span>
              </div>
              {driver.licenseNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-600">License Number</label>
                  <p className="text-lg text-gray-900">{driver.licenseNumber}</p>
                  {driver.licenseExpiry && (
                    <p className="text-sm text-gray-500">Expires: {new Date(driver.licenseExpiry).toLocaleDateString()}</p>
                  )}
                </div>
              )}
              {driver.emergencyContact && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Emergency Contact</label>
                  <p className="text-lg text-gray-900">{driver.emergencyContact}</p>
                  {driver.emergencyPhone && (
                    <p className="text-sm text-gray-500">{driver.emergencyPhone}</p>
                  )}
                </div>
              )}
            </div>
          </div>

        {/* Vehicle Information */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Vehicle Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Vehicle Type</label>
              <p className="text-lg text-gray-900">{driver.vehicleType || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Vehicle Details</label>
              <p className="text-lg text-gray-900">
                {driver.vehicleYear && driver.vehicleMake && driver.vehicleModel
                  ? `${driver.vehicleYear} ${driver.vehicleMake} ${driver.vehicleModel}`
                  : 'Not specified'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">License Plate</label>
              <p className="text-lg text-gray-900">{driver.vehiclePlate || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Refrigeration</label>
              <p className="text-lg text-gray-900">
                {driver.hasRefrigeration ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Certifications & Training</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">UN3373 Certified</label>
              <p className="text-lg text-gray-900">
                {driver.un3373Certified ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">HIPAA Training</label>
              <p className="text-lg text-gray-900">
                {driver.hipaaTrainingDate
                  ? new Date(driver.hipaaTrainingDate).toLocaleDateString()
                  : 'Not completed'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Driver License</label>
              <p className="text-lg text-gray-900">{driver.licenseNumber || 'Not provided'}</p>
              {driver.licenseExpiry && (
                <p className="text-sm text-gray-600">
                  Expires: {new Date(driver.licenseExpiry).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Password Section */}
      <div className="glass p-6 rounded-2xl mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="px-4 py-2 text-slate-600 hover:text-slate-700 font-medium"
            >
              Change Password
            </button>
          )}
        </div>
        {isChangingPassword && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password *</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Password *</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                required
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password *</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg disabled:opacity-50"
              >
                {isSaving ? 'Changing...' : 'Change Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false)
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

