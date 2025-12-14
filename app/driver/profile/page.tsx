'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { showToast, showApiError } from '@/lib/toast'
import DocumentViewButton from '@/components/features/DocumentViewButton'
import ProfilePictureUpload from '@/components/features/ProfilePictureUpload'

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
  profilePicture?: string | null
  bio?: string | null
  specialties?: string | null
  yearsOfExperience?: number | null
  languages?: string | null
  serviceAreas?: string | null
  emergencyContact?: string | null
  emergencyPhone?: string | null
}

export default function DriverProfilePage() {
  const router = useRouter()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadType, setUploadType] = useState('DRIVERS_LICENSE')
  const [uploadExpiryDate, setUploadExpiryDate] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Documents that can expire (for display purposes only)
  const EXPIRABLE_DOCS = [
    'DRIVERS_LICENSE',
    'VEHICLE_INSURANCE',
    'VEHICLE_REGISTRATION',
    'HIPAA_CERTIFICATE',
    'UN3373_CERTIFICATE',
  ]
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    emergencyContact: '',
    emergencyPhone: '',
    profilePicture: '',
    bio: '',
    specialties: '',
    yearsOfExperience: '',
    languages: '',
    serviceAreas: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const fetchDocuments = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/profile-documents`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driver || !uploadFile || !uploadTitle) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('type', uploadType)
      formData.append('title', uploadTitle)
      if (uploadExpiryDate) {
        formData.append('expiryDate', new Date(uploadExpiryDate).toISOString())
      }

      const response = await fetch(`/api/drivers/${driver.id}/profile-documents`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to upload document')
      }

      await fetchDocuments(driver.id)
      setShowUploadModal(false)
      setUploadFile(null)
      setUploadTitle('')
      setUploadType('DRIVERS_LICENSE')
      setUploadExpiryDate('')
      showToast.success('Document uploaded successfully!')
    } catch (error) {
      console.error('Error uploading document:', error)
      showApiError(error, 'Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!driver) return

    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      const response = await fetch(`/api/drivers/${driver.id}/profile-documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete document')
      }

      await fetchDocuments(driver.id)
      showToast.success('Document deleted successfully')
    } catch (error) {
      console.error('Error deleting document:', error)
      showApiError(error, 'Failed to delete document')
    }
  }

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
      profilePicture: parsedDriver.profilePicture || '',
      bio: parsedDriver.bio || '',
      specialties: parsedDriver.specialties || '',
      yearsOfExperience: parsedDriver.yearsOfExperience?.toString() || '',
      languages: parsedDriver.languages || '',
      serviceAreas: parsedDriver.serviceAreas || '',
    })
    setIsLoading(false)
    if (parsedDriver?.id) {
      fetchDocuments(parsedDriver.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          profilePicture: formData.profilePicture || null,
          bio: formData.bio || null,
          specialties: formData.specialties || null,
          yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
          languages: formData.languages || null,
          serviceAreas: formData.serviceAreas || null,
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 print:p-4">
      <div className="sticky top-[73px] z-30 bg-gradient-medical-bg pt-8 pb-4 mb-8 print:mb-4 print:static print:top-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">My Profile</h1>
            <p className="text-gray-600 print:text-sm">Manage your personal information and settings</p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-3 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-medical flex items-center gap-2 mr-6"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Picture</h2>
            <ProfilePictureUpload
              currentImage={formData.profilePicture}
              onImageChange={(base64) => setFormData({ ...formData, profilePicture: base64 })}
              size={200}
            />
            <p className="text-sm text-gray-600 mt-4">
              Your profile picture helps shippers recognize you. It will be visible to shippers when you're assigned to their loads.
            </p>
          </div>

          <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
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
                  className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">License Number</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">License Expiry</label>
                <input
                  type="date"
                  value={formData.licenseExpiry}
                  onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Phone</label>
                <input
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                />
              </div>
            </div>
          </div>

          {/* Personalization Section */}
          <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Personalization</h2>
            <p className="text-sm text-gray-600 mb-6">
              Help shippers get to know you better. This information will be visible to shippers when you're assigned to their loads.
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bio / About Me</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                  rows={4}
                  placeholder="Tell shippers about yourself, your experience, and what makes you a great medical courier..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Specialties</label>
                  <input
                    type="text"
                    value={formData.specialties}
                    onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                    placeholder="e.g., STAT, Temperature-Controlled, Long Distance"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list of your specialties</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Years of Experience</label>
                  <input
                    type="number"
                    value={formData.yearsOfExperience}
                    onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                    placeholder="e.g., 5"
                    min="0"
                    max="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Languages Spoken</label>
                  <input
                    type="text"
                    value={formData.languages}
                    onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                    placeholder="e.g., English, Spanish, French"
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list of languages</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Service Areas</label>
                  <input
                    type="text"
                    value={formData.serviceAreas}
                    onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                    placeholder="e.g., Dallas Metro, Houston, Austin"
                  />
                  <p className="text-xs text-gray-500 mt-1">Regions or areas you typically serve</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-medical disabled:opacity-50"
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
                  profilePicture: driver.profilePicture || '',
                  bio: driver.bio || '',
                  specialties: driver.specialties || '',
                  yearsOfExperience: driver.yearsOfExperience?.toString() || '',
                  languages: driver.languages || '',
                  serviceAreas: driver.serviceAreas || '',
                })
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Profile Picture Display - Left Side */}
            <div className="md:col-span-1 flex">
              <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical text-center w-full flex flex-col">
                <div className="flex justify-center mb-4">
                  {driver.profilePicture ? (
                    <div className="relative rounded-full overflow-hidden border-4 border-teal-200 shadow-lg flex-shrink-0" style={{ width: '220px', height: '220px' }}>
                      <img
                        src={driver.profilePicture}
                        alt={`${driver.firstName} ${driver.lastName}`}
                        className="absolute inset-0 w-full h-full object-cover object-center"
                        style={{ 
                          objectFit: 'cover', 
                          objectPosition: 'center',
                          width: '100%',
                          height: '100%',
                          minWidth: '100%',
                          minHeight: '100%'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-full overflow-hidden border-4 border-teal-200 shadow-lg bg-gradient-accent flex items-center justify-center flex-shrink-0" style={{ width: '220px', height: '220px' }}>
                      <svg className="w-28 h-28 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{driver.firstName} {driver.lastName}</h2>
                {driver.yearsOfExperience && (
                  <p className="text-sm text-gray-600 mt-1">{driver.yearsOfExperience} {driver.yearsOfExperience === 1 ? 'Year' : 'Years'} Experience</p>
                )}
                {driver.specialties && (
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {driver.specialties.split(',').map((s: string) => (
                      <span key={s.trim()} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                )}
                {driver.bio && (
                  <p className="text-sm text-gray-700 italic mt-4">"{driver.bio}"</p>
                )}
              </div>
            </div>

            {/* Personal Information - Right Side */}
            <div className="md:col-span-2 flex">
              <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical w-full flex flex-col">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
                <div className="space-y-4 flex-1">
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
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border-2 ${
                      driver.status === 'ACTIVE'
                        ? 'bg-success-100 text-success-700 border-success-200'
                        : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
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
            </div>
          </div>

          {/* Personalization Information */}
          {(driver.bio || driver.specialties || driver.yearsOfExperience || driver.languages || driver.serviceAreas) && (
            <div className="glass-accent p-6 rounded-2xl border-2 border-teal-200/30 shadow-medical">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
              <div className="space-y-4">
                {driver.bio && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Bio</label>
                    <p className="text-gray-900 mt-1">{driver.bio}</p>
                  </div>
                )}
                {driver.yearsOfExperience && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Years of Experience</label>
                    <p className="text-gray-900">{driver.yearsOfExperience} {driver.yearsOfExperience === 1 ? 'year' : 'years'}</p>
                  </div>
                )}
                {driver.specialties && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Specialties</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {driver.specialties.split(',').map((specialty, idx) => (
                        <span key={idx} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium border border-teal-200">
                          {specialty.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {driver.languages && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Languages</label>
                    <p className="text-gray-900">{driver.languages}</p>
                  </div>
                )}
                {driver.serviceAreas && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Service Areas</label>
                    <p className="text-gray-900">{driver.serviceAreas}</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
        </div>
      )}

      {/* Change Password Section */}
      <div className="glass p-6 rounded-2xl mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="px-4 py-2 text-accent-700 hover:text-accent-800 font-medium"
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

      {/* Documents Section */}
      <div id="documents" className="glass-accent p-6 rounded-2xl mt-6 border-2 border-teal-200/30 shadow-medical">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Documents</h2>
            <p className="text-sm mt-1 text-gray-600">
              Store and access your documents to share with shippers when needed
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-gradient-accent text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-medical flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Upload and manage your documents such as driver's license, insurance, certifications, and more. You can access these anytime to verify credentials with shippers.
        </p>

        {documents.filter(d => d.isActive).length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.filter(d => d.isActive).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-white/60 rounded-lg border border-gray-200">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{doc.title}</p>
                      <span className="px-2 py-0.5 bg-accent-100 text-accent-700 rounded text-xs font-medium border border-accent-200">
                        {doc.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                      {doc.expiryDate && (() => {
                        const expiryDate = new Date(doc.expiryDate)
                        const now = new Date()
                        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                        const isExpired = expiryDate < now
                        const isExpiringSoon = !isExpired && daysUntilExpiry <= 30
                        
                        return (
                          <span className={`${
                            isExpired 
                              ? 'text-gray-500' 
                              : isExpiringSoon
                              ? 'text-gray-600'
                              : 'text-gray-500'
                          }`}>
                            {isExpired ? 'Expired: ' : isExpiringSoon ? 'Expires soon: ' : 'Expires: '}
                            {expiryDate.toLocaleDateString()}
                            {!isExpired && isExpiringSoon && ` (${daysUntilExpiry} days)`}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DocumentViewButton
                    url={doc.url}
                    title={doc.title}
                    type={doc.type}
                  />
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-2 text-urgent-600 hover:bg-urgent-50 rounded-lg transition-colors"
                    title="Delete document"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-accent max-w-2xl w-full rounded-3xl p-6 border-2 border-teal-200/30 shadow-medical">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Upload Document</h3>

            <form onSubmit={handleDocumentUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Document Type *
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                  required
                >
                  <option value="DRIVERS_LICENSE">Driver's License</option>
                  <option value="VEHICLE_INSURANCE">Vehicle Insurance</option>
                  <option value="VEHICLE_REGISTRATION">Vehicle Registration</option>
                  <option value="HIPAA_CERTIFICATE">HIPAA Training Certificate</option>
                  <option value="UN3373_CERTIFICATE">UN3373 Certification</option>
                  <option value="W9_FORM">W-9 Form</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                  placeholder="e.g., Driver's License, Insurance Policy #12345"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={uploadExpiryDate}
                  onChange={(e) => setUploadExpiryDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                />
                <p className="text-xs text-gray-500 mt-1">Set expiry date for licenses, insurance, certifications, etc.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  File (PDF, Image) *
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf,.jpg,.jpeg,.png,image/jpeg,image/png,image/heic"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    if (file) {
                      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic']
                      const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.heic']
                      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
                      
                      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
                        showToast.error('Invalid file type', 'Please upload a PDF or image file (PDF, JPG, PNG, HEIC).')
                        e.target.value = ''
                        setUploadFile(null)
                        return
                      }
                      
                      if (file.size > 10 * 1024 * 1024) {
                        showToast.error('File too large', `Maximum size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`)
                        e.target.value = ''
                        setUploadFile(null)
                        return
                      }
                    }
                    setUploadFile(file)
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60"
                  required={!uploadFile}
                />
                {uploadFile && (
                  <p className="text-sm text-green-600 mt-1">✓ {uploadFile.name} selected</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Accepted: PDF, JPG, PNG, HEIC. Max file size: 10MB</p>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadFile(null)
                    setUploadTitle('')
                    setUploadType('DRIVERS_LICENSE')
                    setUploadExpiryDate('')
                  }}
                  className="flex-1 px-6 py-3 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile || !uploadTitle}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-accent text-white font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-base shadow-medical"
                >
                  {isUploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

