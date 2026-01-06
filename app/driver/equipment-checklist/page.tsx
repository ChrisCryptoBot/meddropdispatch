'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EQUIPMENT_ITEMS, getRequiredItems, getItemsByCategory, type EquipmentItem } from '@/lib/equipment-items'
import { showToast } from '@/lib/toast'

interface ChecklistItem {
  checked: boolean
  notes?: string
}

export default function EquipmentChecklistPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [checkedItems, setCheckedItems] = useState<Record<string, ChecklistItem>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    if (!driverData) {
      router.push('/driver/login')
      return
    }

    try {
      const parsedDriver = JSON.parse(driverData)
      setDriver(parsedDriver)
      fetchChecklist(parsedDriver.id)
    } catch (error) {
      console.error('Error parsing driver data:', error)
      router.push('/driver/login')
    }
  }, [router])

  const fetchChecklist = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/equipment-checklist`)
      if (response.ok) {
        const data = await response.json()
        setCheckedItems(data.checklist.checkedItems || {})
      }
    } catch (error) {
      console.error('Error fetching checklist:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleItem = (itemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: {
        checked: !prev[itemId]?.checked,
        notes: prev[itemId]?.notes || '',
      },
    }))
  }

  const handleNotesChange = (itemId: string, notes: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes,
      },
    }))
  }

  const handleSave = async () => {
    if (!driver) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/drivers/${driver.id}/equipment-checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedItems }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save checklist')
      }

      showToast.success('Equipment checklist saved!', 'Your checklist has been updated.')
    } catch (error) {
      console.error('Error saving checklist:', error)
      showToast.error('Failed to save', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsSaving(false)
    }
  }

  const requiredItems = getRequiredItems()
  const categories: EquipmentItem['category'][] = ['VEHICLE', 'TEMPERATURE', 'DOCUMENTATION', 'SAFETY', 'OTHER']

  const allRequiredChecked = requiredItems.every(
    item => checkedItems[item.id]?.checked === true
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-medical-bg flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-medical-bg p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-teal-600 hover:text-teal-700 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-4xl font-bold text-gradient mb-2">Equipment Checklist</h1>
          <p className="text-gray-600">
            Check off the equipment you have available. Required items must be checked before approval.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="glass-accent rounded-2xl p-6 border-2 border-teal-200/30 shadow-medical mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Progress</h2>
            <span className="text-2xl font-bold text-teal-600">
              {requiredItems.filter(item => checkedItems[item.id]?.checked).length} / {requiredItems.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-accent h-3 rounded-full transition-all duration-300"
              style={{
                width: `${(requiredItems.filter(item => checkedItems[item.id]?.checked).length / requiredItems.length) * 100}%`,
              }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {allRequiredChecked
              ? '✓ All required items checked!'
              : `${requiredItems.filter(item => !checkedItems[item.id]?.checked).length} required item(s) remaining`}
          </p>
        </div>

        {/* Equipment by Category */}
        {categories.map(category => {
          const items = getItemsByCategory(category)
          if (items.length === 0) return null

          return (
            <div key={category} className="glass-accent rounded-2xl p-6 border-2 border-teal-200/30 shadow-medical mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 capitalize">{category}</h2>
              <div className="space-y-4">
                {items.map(item => {
                  const isChecked = checkedItems[item.id]?.checked || false
                  const isRequired = item.isRequired

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isChecked
                          ? 'bg-teal-50/60 border-teal-300'
                          : isRequired
                          ? 'bg-urgent-50/60 border-urgent-300'
                          : 'bg-white/60 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={item.id}
                          checked={isChecked}
                          onChange={() => handleToggleItem(item.id)}
                          className="mt-1 w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={item.id}
                            className="font-semibold text-gray-900 cursor-pointer flex items-center gap-2"
                          >
                            {item.name}
                            {isRequired && (
                              <span className="text-xs text-urgent-600 font-medium bg-urgent-100 px-2 py-0.5 rounded">
                                Required
                              </span>
                            )}
                          </label>
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          {isChecked && (
                            <div className="mt-3">
                              <textarea
                                placeholder="Optional notes about this equipment..."
                                value={checkedItems[item.id]?.notes || ''}
                                onChange={e => handleNotesChange(item.id, e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white/80"
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-gradient-accent text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-medical disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Checklist'}
          </button>
          <button
            onClick={() => router.push('/driver/pending-approval')}
            className="px-6 py-3 bg-white/60 text-gray-700 rounded-xl font-semibold hover:bg-white/80 transition-all border-2 border-teal-200/30"
          >
            Back to Approval
          </button>
        </div>
      </div>
    </div>
  )
}





