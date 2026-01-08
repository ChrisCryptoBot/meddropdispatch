'use client'

import { useState, useEffect } from 'react'
import { showToast, showApiError } from '@/lib/toast'
import { EmptyStates } from '@/components/ui/EmptyState'

interface VehicleMaintenance {
  vehicleId: string
  vehiclePlate: string
  driverName: string
  currentOdometer: number
  lastServiceOdometer: number | null
  lastServiceDate: Date | null
  milesSinceLastService: number
  status: 'VALID' | 'WARNING' | 'DUE'
  message: string
  maintenanceLogs: Array<{
    id: string
    type: string
    odometer: number
    cost: number
    performedAt: string
    notes: string | null
  }>
}

export default function FleetMaintenancePage() {
  const [vehicles, setVehicles] = useState<VehicleMaintenance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleMaintenance | null>(null)
  const [showLogMaintenanceModal, setShowLogMaintenanceModal] = useState(false)
  const [newMaintenance, setNewMaintenance] = useState({
    type: 'OIL_CHANGE',
    odometer: '',
    cost: '',
    performedAt: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    fetchMaintenanceData()
  }, [])

  const fetchMaintenanceData = async () => {
    try {
      setIsLoading(true)
      // Fetch all drivers
      const driversResponse = await fetch('/api/drivers?limit=1000', {
        credentials: 'include',
      })
      if (!driversResponse.ok) throw new Error('Failed to fetch drivers')
      
      const driversData = await driversResponse.json()
      const allDrivers = driversData.drivers || []

      // Fetch maintenance status for each vehicle
      const vehiclePromises: Promise<any>[] = []
      
      for (const driver of allDrivers) {
        // Fetch driver's vehicles
        try {
          const vehiclesResponse = await fetch(`/api/drivers/${driver.id}/vehicles`, {
            credentials: 'include',
          })
          if (vehiclesResponse.ok) {
            const vehiclesData = await vehiclesResponse.json()
            const driverVehicles = vehiclesData.vehicles || []
            
            for (const vehicle of driverVehicles) {
              if (vehicle.isActive) {
                vehiclePromises.push(
                  fetch(`/api/vehicles/${vehicle.id}/maintenance`, { credentials: 'include' })
                    .then(res => res.ok ? res.json() : null)
                    .then(data => data ? {
                      vehicleId: vehicle.id,
                      vehiclePlate: vehicle.vehiclePlate,
                      driverName: `${driver.firstName} ${driver.lastName}`,
                      currentOdometer: data.vehicle.currentOdometer,
                      lastServiceOdometer: data.maintenanceStatus.lastServiceOdometer,
                      lastServiceDate: data.maintenanceStatus.lastServiceDate,
                      milesSinceLastService: data.maintenanceStatus.milesSinceLastService,
                      status: data.maintenanceStatus.status,
                      message: data.maintenanceStatus.message,
                      maintenanceLogs: data.logs || [],
                    } : null)
                    .catch(() => null)
                )
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching vehicles for driver ${driver.id}:`, error)
        }
      }

      const results = await Promise.all(vehiclePromises)
      const validVehicles = results.filter(v => v !== null)
      
      // Sort by miles since last service (DUE first, then WARNING, then VALID)
      validVehicles.sort((a, b) => {
        if (a.status === 'DUE' && b.status !== 'DUE') return -1
        if (a.status !== 'DUE' && b.status === 'DUE') return 1
        if (a.status === 'WARNING' && b.status === 'VALID') return -1
        if (a.status === 'VALID' && b.status === 'WARNING') return 1
        return b.milesSinceLastService - a.milesSinceLastService
      })
      
      setVehicles(validVehicles)
    } catch (error) {
      console.error('Error fetching maintenance data:', error)
      showApiError(error, 'Failed to fetch maintenance data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogMaintenance = async () => {
    if (!selectedVehicle) return

    if (!newMaintenance.odometer || isNaN(Number(newMaintenance.odometer))) {
      showToast.error('Please enter a valid odometer reading')
      return
    }

    if (!newMaintenance.cost || isNaN(Number(newMaintenance.cost))) {
      showToast.error('Please enter a valid cost')
      return
    }

    try {
      const response = await fetch(`/api/vehicles/${selectedVehicle.vehicleId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: newMaintenance.type,
          odometer: parseInt(newMaintenance.odometer),
          cost: parseFloat(newMaintenance.cost),
          performedAt: newMaintenance.performedAt,
          notes: newMaintenance.notes || undefined,
        }),
      })

      if (response.ok) {
        showToast.success('Maintenance logged successfully')
        setShowLogMaintenanceModal(false)
        setNewMaintenance({
          type: 'OIL_CHANGE',
          odometer: '',
          cost: '',
          performedAt: new Date().toISOString().split('T')[0],
          notes: '',
        })
        await fetchMaintenanceData()
      } else {
        const error = await response.json()
        showApiError(error, 'Failed to log maintenance')
      }
    } catch (error) {
      showApiError(error, 'Failed to log maintenance')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DUE':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'WARNING':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default:
        return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
  }

  if (isLoading) {
    return (
      <div className="px-6 md:px-8 pb-6 md:pb-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    )
  }

  // Calculate alert counts for dashboard
  const overdueCount = vehicles.filter(v => v.status === 'DUE').length
  const warningCount = vehicles.filter(v => v.status === 'WARNING').length

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-0 z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
            Fleet Maintenance Dashboard
          </h1>
          <p className="text-slate-400 text-sm md:text-base">Monitor vehicle maintenance status and service intervals</p>
        </div>
      </div>

      {/* Alert Banners */}
      {overdueCount > 0 && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-400 mb-1">Maintenance Overdue</h3>
              <p className="text-red-300 text-sm">
                {overdueCount} vehicle{overdueCount !== 1 ? 's' : ''} {overdueCount !== 1 ? 'are' : 'is'} overdue for maintenance (&gt;5,000 miles). 
                These vehicles are blocked from new load assignments. Schedule service immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {warningCount > 0 && overdueCount === 0 && (
        <div className="mb-6 p-4 bg-orange-500/20 border border-orange-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-orange-400 mb-1">Maintenance Approaching</h3>
              <p className="text-orange-300 text-sm">
                {warningCount} vehicle{warningCount !== 1 ? 's' : ''} {warningCount !== 1 ? 'are' : 'is'} approaching maintenance due (4,500-5,000 miles). 
                Schedule service soon to avoid blocking new load assignments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vehicles Table */}
      <div className="glass-primary rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white">Vehicles by Maintenance Status</h2>
        </div>
        <div className="overflow-x-auto">
          {vehicles.length === 0 ? (
            <div className="p-12">
              <EmptyStates.NoLoads
                title="No vehicles found"
                description="No active vehicles in the system"
              />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Odometer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Miles Since Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Service</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.vehicleId} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-white">{vehicle.vehiclePlate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{vehicle.driverName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {vehicle.currentOdometer.toLocaleString()} mi
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {vehicle.milesSinceLastService.toLocaleString()} mi
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {vehicle.lastServiceDate
                        ? new Date(vehicle.lastServiceDate).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(vehicle.status)}`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          setSelectedVehicle(vehicle)
                          setShowLogMaintenanceModal(true)
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30 text-sm"
                      >
                        Log Service
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log Maintenance Modal */}
      {showLogMaintenanceModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLogMaintenanceModal(false)}>
          <div className="glass-primary p-8 rounded-2xl max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4">Log Maintenance Service</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Vehicle</label>
                <div className="px-4 py-2 bg-slate-800/50 rounded-lg text-slate-300 border border-slate-600/50">
                  {selectedVehicle.vehiclePlate}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Service Type</label>
                <select
                  value={newMaintenance.type}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-white"
                >
                  <option value="OIL_CHANGE">Oil Change</option>
                  <option value="TIRE_ROTATION">Tire Rotation</option>
                  <option value="INSPECTION">Inspection</option>
                  <option value="REPAIR">Repair</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Odometer Reading</label>
                <input
                  type="number"
                  min="0"
                  value={newMaintenance.odometer}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, odometer: e.target.value })}
                  placeholder={`Current: ${selectedVehicle.currentOdometer.toLocaleString()}`}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newMaintenance.cost}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, cost: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Date Performed</label>
                <input
                  type="date"
                  value={newMaintenance.performedAt}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, performedAt: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Notes (optional)</label>
                <textarea
                  value={newMaintenance.notes}
                  onChange={(e) => setNewMaintenance({ ...newMaintenance, notes: e.target.value })}
                  placeholder="Additional notes about the service..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowLogMaintenanceModal(false)
                  setSelectedVehicle(null)
                  setNewMaintenance({
                    type: 'OIL_CHANGE',
                    odometer: '',
                    cost: '',
                    performedAt: new Date().toISOString().split('T')[0],
                    notes: '',
                  })
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 border border-slate-600/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogMaintenance}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
              >
                Log Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

