'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { showToast, showApiError } from '@/lib/toast'

interface Vehicle {
  id: string
  vehicleType: string
  vehicleMake?: string | null
  vehicleModel?: string | null
  vehicleYear?: number | null
  vehiclePlate: string
  hasRefrigeration: boolean
  nickname?: string | null
  isActive: boolean
  // Compliance & Liability Shield (V2)
  registrationExpiryDate?: string | null
  insuranceExpiryDate?: string | null
  registrationNumber?: string | null
  registrationDocumentId?: string | null
  registrationDocument?: {
    id: string
    title: string
    url: string
    expiryDate?: string | null
  } | null
}

export default function DriverVehiclePage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)

  const [formData, setFormData] = useState({
    vehicleType: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    hasRefrigeration: false,
    nickname: '',
    registrationExpiryDate: '',
    registrationNumber: '',
  })
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [renewingVehicle, setRenewingVehicle] = useState<Vehicle | null>(null)
  const [renewFormData, setRenewFormData] = useState({
    registrationExpiryDate: '',
    registrationNumber: '',
    registrationDocument: null as File | null,
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
        fetchVehicles(data.user.id)
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  const fetchVehicles = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/vehicles`)
      if (response.ok) {
        const data = await response.json()
        setVehicles(data.vehicles || [])
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      vehicleType: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: '',
      vehiclePlate: '',
      hasRefrigeration: false,
      nickname: '',
      registrationExpiryDate: '',
      registrationNumber: '',
    })
    setEditingVehicle(null)
  }

  // Calculate compliance status for a vehicle
  const getComplianceStatus = (vehicle: Vehicle): { status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'MISSING' | 'INACTIVE'; badge: JSX.Element; daysUntilExpiry?: number } => {
    if (!vehicle.isActive) {
      return {
        status: 'INACTIVE',
        badge: <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs font-medium border border-slate-600/50">Inactive</span>
      }
    }

    if (!vehicle.registrationExpiryDate) {
      return {
        status: 'MISSING',
        badge: <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium border border-red-500/30">Missing Registration</span>
      }
    }

    const expiryDate = new Date(vehicle.registrationExpiryDate)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (expiryDate < now) {
      return {
        status: 'EXPIRED',
        badge: <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium border border-red-500/30">Expired</span>,
        daysUntilExpiry
      }
    }

    if (daysUntilExpiry <= 30) {
      return {
        status: 'EXPIRING',
        badge: <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium border border-yellow-500/30">Expiring Soon</span>,
        daysUntilExpiry
      }
    }

    return {
      status: 'VALID',
      badge: <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium border border-green-500/30">Valid</span>,
      daysUntilExpiry
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      vehicleType: vehicle.vehicleType,
      vehicleMake: vehicle.vehicleMake || '',
      vehicleModel: vehicle.vehicleModel || '',
      vehicleYear: vehicle.vehicleYear?.toString() || '',
      vehiclePlate: vehicle.vehiclePlate,
      hasRefrigeration: vehicle.hasRefrigeration,
      nickname: vehicle.nickname || '',
      registrationExpiryDate: vehicle.registrationExpiryDate ? new Date(vehicle.registrationExpiryDate).toISOString().split('T')[0] : '',
      registrationNumber: vehicle.registrationNumber || '',
    })
    setShowAddModal(true)
  }

  const handleRenewRegistration = (vehicle: Vehicle) => {
    setRenewingVehicle(vehicle)
    setRenewFormData({
      registrationExpiryDate: vehicle.registrationExpiryDate ? new Date(vehicle.registrationExpiryDate).toISOString().split('T')[0] : '',
      registrationNumber: vehicle.registrationNumber || '',
      registrationDocument: null,
    })
    setShowRenewModal(true)
  }

  const handleRenewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!driver || !renewingVehicle) return

    setIsSaving(true)

    try {
      // TODO: Upload document first if provided, then update vehicle
      // For now, just update the registration date and number
      const response = await fetch(`/api/drivers/${driver.id}/vehicles/${renewingVehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationExpiryDate: renewFormData.registrationExpiryDate || null,
          registrationNumber: renewFormData.registrationNumber || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update registration')
      }

      await fetchVehicles(driver.id)
      setShowRenewModal(false)
      setRenewingVehicle(null)
      setRenewFormData({ registrationExpiryDate: '', registrationNumber: '', registrationDocument: null })
      showToast.success('Registration updated successfully!')
    } catch (error) {
      showApiError(error, 'Failed to update registration')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!driver) return

    setIsSaving(true)

    try {
      const url = editingVehicle
        ? `/api/drivers/${driver.id}/vehicles/${editingVehicle.id}`
        : `/api/drivers/${driver.id}/vehicles`
      
      const method = editingVehicle ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleType: formData.vehicleType,
          vehicleMake: formData.vehicleMake || null,
          vehicleModel: formData.vehicleModel || null,
          vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
          vehiclePlate: formData.vehiclePlate,
          hasRefrigeration: formData.hasRefrigeration,
          nickname: formData.nickname || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save vehicle')
      }

      await fetchVehicles(driver.id)
      setShowAddModal(false)
      resetForm()
      showToast.success(
        editingVehicle ? 'Vehicle updated successfully!' : 'Vehicle added successfully!'
      )
    } catch (error) {
      showApiError(error, 'Failed to save vehicle')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (vehicle: Vehicle) => {
    if (!driver) return

    if (!confirm(`Are you sure you want to delete ${vehicle.nickname || vehicle.vehiclePlate}? This will deactivate the vehicle.`)) {
      return
    }

    try {
      const response = await fetch(`/api/drivers/${driver.id}/vehicles/${vehicle.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete vehicle')
      }

      await fetchVehicles(driver.id)
      showToast.success('Vehicle deleted successfully')
    } catch (error) {
      showApiError(error, 'Failed to delete vehicle')
    }
  }

  const activeVehicles = vehicles.filter(v => v.isActive)
  const inactiveVehicles = vehicles.filter(v => !v.isActive)

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading vehicles...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[100px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Vehicle Management
        </h1>
        <p className="text-slate-400">Manage your vehicles</p>
      </div>
      <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Vehicle
          </button>
        </div>

      {/* Active Vehicles */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Active Vehicles</h2>
        {activeVehicles.length === 0 ? (
          <div className="glass-primary rounded-xl p-8 text-center border border-slate-700/50 shadow-lg">
            <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="text-slate-400 mb-4">No active vehicles yet</p>
            <button
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
            >
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeVehicles.map((vehicle) => (
              <div key={vehicle.id} className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-xl font-bold text-white">
                        {vehicle.nickname || `${vehicle.vehicleType.replace(/_/g, ' ')}`}
                      </h3>
                      {vehicle.hasRefrigeration && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium border border-green-500/30">
                          Refrigerated
                        </span>
                      )}
                      {getComplianceStatus(vehicle).badge}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
                      <div>
                        <span className="font-medium">Type:</span> {vehicle.vehicleType.replace(/_/g, ' ')}
                      </div>
                      <div>
                        <span className="font-medium">Plate:</span> {vehicle.vehiclePlate}
                      </div>
                      {vehicle.vehicleYear && vehicle.vehicleMake && vehicle.vehicleModel && (
                        <div className="col-span-2">
                          <span className="font-medium">Details:</span> {vehicle.vehicleYear} {vehicle.vehicleMake} {vehicle.vehicleModel}
                        </div>
                      )}
                      {vehicle.registrationExpiryDate && (
                        <div className="col-span-2">
                          <span className="font-medium">Registration Expires:</span>{' '}
                          <span className={getComplianceStatus(vehicle).status === 'EXPIRED' ? 'text-red-400' : getComplianceStatus(vehicle).status === 'EXPIRING' ? 'text-yellow-400' : 'text-green-400'}>
                            {new Date(vehicle.registrationExpiryDate).toLocaleDateString()}
                            {getComplianceStatus(vehicle).daysUntilExpiry !== undefined && (
                              <span className="ml-2">
                                ({getComplianceStatus(vehicle).daysUntilExpiry! > 0 ? `${getComplianceStatus(vehicle).daysUntilExpiry} days` : 'Expired'})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {!vehicle.registrationExpiryDate && (
                        <div className="col-span-2 text-red-400 text-xs">
                          ⚠️ Registration date required for compliance
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(getComplianceStatus(vehicle).status === 'EXPIRED' || getComplianceStatus(vehicle).status === 'EXPIRING' || getComplianceStatus(vehicle).status === 'MISSING') && (
                      <button
                        onClick={() => handleRenewRegistration(vehicle)}
                        className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg font-semibold hover:bg-yellow-500/30 transition-colors border border-yellow-500/30"
                      >
                        Renew Registration
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="px-4 py-2 bg-slate-700/50 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 transition-colors border border-slate-600/50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-semibold hover:bg-red-500/30 transition-colors border border-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Vehicles */}
      {inactiveVehicles.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Inactive Vehicles</h2>
          <div className="grid gap-4">
            {inactiveVehicles.map((vehicle) => (
              <div key={vehicle.id} className="glass-primary rounded-xl p-6 opacity-60 border border-slate-700/50 shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">
                        {vehicle.nickname || `${vehicle.vehicleType.replace(/_/g, ' ')}`}
                      </h3>
                      <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded text-xs font-medium border border-slate-600/50">
                        Inactive
                      </span>
                    </div>
                    <div className="text-sm text-slate-400">
                      <span className="font-medium">Plate:</span> {vehicle.vehiclePlate}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="px-4 py-2 bg-slate-700/50 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 transition-colors border border-slate-600/50"
                  >
                    Reactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-primary max-w-2xl w-full rounded-xl p-6 border border-slate-700/50 shadow-lg">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Vehicle Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="e.g., Work Van, Backup Truck"
                />
                <p className="text-xs text-slate-500 mt-1">A friendly name to identify this vehicle</p>
              </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Vehicle Type *
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
                required
              >
                <option value="">Select vehicle type</option>
                <option value="SEDAN">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="VAN">Van</option>
                <option value="SPRINTER">Sprinter</option>
                <option value="BOX_TRUCK">Box Truck</option>
                <option value="REFRIGERATED">Refrigerated</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Make
                </label>
                <input
                  type="text"
                  value={formData.vehicleMake}
                  onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="e.g., Ford"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="e.g., Transit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  value={formData.vehicleYear}
                  onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="2024"
                  min="1900"
                  max="2100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                    License Plate *
                </label>
                <input
                  type="text"
                  value={formData.vehiclePlate}
                  onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="ABC-1234"
                    required
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.hasRefrigeration}
                  onChange={(e) => setFormData({ ...formData, hasRefrigeration: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600/50 text-cyan-600 focus:ring-cyan-500 bg-slate-800/50"
                />
                <span className="text-sm font-semibold text-slate-300">
                  Vehicle has refrigeration capability
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1 ml-8">
                Required for temperature-controlled shipments
              </p>
          </div>

          {/* Registration Information */}
          <div className="pt-4 border-t border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Registration & Compliance</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Registration Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.registrationExpiryDate}
                  onChange={(e) => setFormData({ ...formData, registrationExpiryDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
                />
                <p className="text-xs text-slate-500 mt-1">Required for vehicle compliance</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="ABC-1234"
                />
              </div>
            </div>
          </div>

              <div className="flex gap-4 pt-4">
            <button
              type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700/50 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 transition-colors border border-slate-600/50"
            >
              Cancel
            </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
          </div>
        </form>
      </div>
        </div>
      )}
    </div>
  )
}

