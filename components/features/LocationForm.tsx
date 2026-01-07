'use client'

import { useState } from 'react'

export interface LocationData {
  facilityName: string
  facilityType: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  contactName: string
  contactPhone: string
  accessNotes?: string
  readyTime?: string
}

interface LocationFormProps {
  locationType: 'PICKUP' | 'DROPOFF'
  index: number
  location: LocationData
  onChange: (index: number, data: LocationData) => void
  onRemove: (index: number) => void
  canRemove: boolean
  label?: string
}

export default function LocationForm({
  locationType,
  index,
  location,
  onChange,
  onRemove,
  canRemove,
  label,
}: LocationFormProps) {
  const handleChange = (field: keyof LocationData, value: string) => {
    onChange(index, { ...location, [field]: value })
  }

  const prefix = locationType === 'PICKUP' ? 'pickup' : 'dropoff'
  const displayLabel = label || `${locationType === 'PICKUP' ? 'Pickup' : 'Dropoff'} ${index + 1}`

  return (
    <div className="glass-primary p-6 rounded-xl border border-slate-700/50 relative">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xl font-bold text-white">{displayLabel}</h4>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="px-3 py-1 text-sm bg-red-500/80 text-white rounded-lg hover:bg-red-600 transition-colors border border-red-500/30"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Facility Name *
          </label>
          <input
            type="text"
            value={location.facilityName}
            onChange={(e) => handleChange('facilityName', e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            placeholder={locationType === 'PICKUP' ? 'Main Clinic Location' : 'Central Lab'}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Facility Type *
          </label>
          <select
            value={location.facilityType}
            onChange={(e) => handleChange('facilityType', e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
          >
            <option value="">Select type...</option>
            <option value="CLINIC">Clinic</option>
            <option value="LAB">Laboratory</option>
            <option value="HOSPITAL">Hospital</option>
            <option value="PHARMACY">Pharmacy</option>
            <option value="DIALYSIS">Dialysis Center</option>
            <option value="IMAGING">Imaging Center</option>
            <option value="GOVERNMENT">Government Facility</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Street Address *
          </label>
          <input
            type="text"
            value={location.addressLine1}
            onChange={(e) => handleChange('addressLine1', e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            placeholder="123 Main St"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Suite/Unit (Optional)
          </label>
          <input
            type="text"
            value={location.addressLine2 || ''}
            onChange={(e) => handleChange('addressLine2', e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            placeholder="Suite 200"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            City *
          </label>
          <input
            type="text"
            value={location.city}
            onChange={(e) => handleChange('city', e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            placeholder="Los Angeles"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            State *
          </label>
          <input
            type="text"
            value={location.state}
            onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
            required
            maxLength={2}
            className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 uppercase"
            placeholder="CA"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            ZIP Code *
          </label>
          <input
            type="text"
            value={location.postalCode}
            onChange={(e) => handleChange('postalCode', e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            placeholder="90001"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Contact Name *
          </label>
          <input
            type="text"
            value={location.contactName}
            onChange={(e) => handleChange('contactName', e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Contact Phone *
          </label>
          <input
            type="tel"
            value={location.contactPhone}
            onChange={(e) => handleChange('contactPhone', e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            placeholder="(555) 987-6543"
          />
        </div>

        {locationType === 'PICKUP' && (
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Ready for Pickup At
            </label>
            <input
              type="datetime-local"
              value={location.readyTime || ''}
              onChange={(e) => handleChange('readyTime', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
            />
          </div>
        )}

        {locationType === 'DROPOFF' && (
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Delivery Deadline
            </label>
            <input
              type="datetime-local"
              value={location.readyTime || ''}
              onChange={(e) => handleChange('readyTime', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200"
            />
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Access Notes / Instructions
          </label>
          <textarea
            value={location.accessNotes || ''}
            onChange={(e) => handleChange('accessNotes', e.target.value)}
            rows={2}
            className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            placeholder="e.g., Use rear entrance, ring bell for loading dock"
          />
        </div>
      </div>
    </div>
  )
}

