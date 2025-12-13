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
  })

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    const parsed = JSON.parse(driverData)
    setDriver(parsed)
    fetchVehicles(parsed.id)
  }, [router])

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
    })
    setEditingVehicle(null)
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
    })
    setShowAddModal(true)
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading vehicles...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Vehicle Management</h1>
          <p className="text-gray-600">Manage your vehicles</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowAddModal(true)
          }}
          className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Vehicle
        </button>
      </div>

      {/* Active Vehicles */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Vehicles</h2>
        {activeVehicles.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="text-gray-600 mb-4">No active vehicles yet</p>
            <button
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold hover:bg-slate-700 transition-colors"
            >
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeVehicles.map((vehicle) => (
              <div key={vehicle.id} className="glass rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {vehicle.nickname || `${vehicle.vehicleType.replace(/_/g, ' ')}`}
                      </h3>
                      {vehicle.hasRefrigeration && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Refrigerated
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-colors"
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Inactive Vehicles</h2>
          <div className="grid gap-4">
            {inactiveVehicles.map((vehicle) => (
              <div key={vehicle.id} className="glass rounded-2xl p-6 opacity-60">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {vehicle.nickname || `${vehicle.vehicleType.replace(/_/g, ' ')}`}
                      </h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        Inactive
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Plate:</span> {vehicle.vehiclePlate}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
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
          <div className="glass max-w-2xl w-full rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Vehicle Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60"
                  placeholder="e.g., Work Van, Backup Truck"
                />
                <p className="text-xs text-gray-500 mt-1">A friendly name to identify this vehicle</p>
              </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vehicle Type *
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Make
                </label>
                <input
                  type="text"
                  value={formData.vehicleMake}
                  onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60"
                  placeholder="e.g., Ford"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60"
                  placeholder="e.g., Transit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  value={formData.vehicleYear}
                  onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60"
                  placeholder="2024"
                  min="1900"
                  max="2100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    License Plate *
                </label>
                <input
                  type="text"
                  value={formData.vehiclePlate}
                  onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white/60"
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
                  className="w-5 h-5 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Vehicle has refrigeration capability
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-8">
                Required for temperature-controlled shipments
              </p>
          </div>

              <div className="flex gap-4 pt-4">
            <button
              type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg font-semibold hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg disabled:opacity-50"
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
