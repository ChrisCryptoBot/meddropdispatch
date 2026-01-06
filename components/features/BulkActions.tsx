'use client'

// Bulk Actions Component
// Provides UI for bulk operations on load requests

import { useState } from 'react'

interface BulkActionsProps {
  selectedLoadIds: string[]
  onActionComplete: () => void
}

export default function BulkActions({ selectedLoadIds, onActionComplete }: BulkActionsProps) {
  const [showModal, setShowModal] = useState(false)
  const [action, setAction] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionData, setActionData] = useState<any>({})

  if (selectedLoadIds.length === 0) {
    return null
  }

  const handleBulkAction = async () => {
    if (!action) return

    setIsProcessing(true)
    try {
      let response: Response

      switch (action) {
        case 'update_status':
          response = await fetch('/api/load-requests/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_status',
              loadRequestIds: selectedLoadIds,
              status: actionData.status,
              eventLabel: actionData.eventLabel,
              eventDescription: actionData.eventDescription,
            }),
          })
          break

        case 'assign_driver':
          response = await fetch('/api/load-requests/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'assign_driver',
              loadRequestIds: selectedLoadIds,
              driverId: actionData.driverId,
            }),
          })
          break

        case 'generate_invoices':
          response = await fetch('/api/load-requests/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'generate_invoices',
              loadRequestIds: selectedLoadIds,
            }),
          })
          break

        case 'export_csv':
          response = await fetch('/api/load-requests/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'export_csv',
              loadRequestIds: selectedLoadIds,
            }),
          })
          break

        default:
          alert('Unknown action')
          setIsProcessing(false)
          return
      }

      if (response.ok) {
        const result = await response.json()
        alert(`Bulk action completed: ${JSON.stringify(result.result)}`)
        setShowModal(false)
        setAction('')
        setActionData({})
        onActionComplete()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Bulk action failed')
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
      alert(error instanceof Error ? error.message : 'Failed to perform bulk action')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-blue-600 text-white p-4 shadow-lg z-40 md:block hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold">
              {selectedLoadIds.length} load{selectedLoadIds.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Bulk Actions
            </button>
          </div>
          <button
            onClick={() => onActionComplete()}
            className="text-white hover:text-gray-200"
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Bulk Actions Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass max-w-md w-full rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Bulk Actions</h3>
            <p className="text-sm text-gray-600 mb-6">
              Perform action on {selectedLoadIds.length} selected load{selectedLoadIds.length !== 1 ? 's' : ''}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Action *
                </label>
                <select
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value)
                    setActionData({})
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                >
                  <option value="">Select action...</option>
                  <option value="update_status">Update Status</option>
                  <option value="assign_driver">Assign Driver</option>
                  <option value="generate_invoices">Generate Invoices</option>
                  <option value="export_csv">Export CSV</option>
                </select>
              </div>

              {/* Action-specific fields */}
              {action === 'update_status' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                    <select
                      value={actionData.status || ''}
                      onChange={(e) => setActionData({ ...actionData, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300"
                      required
                    >
                      <option value="">Select status...</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="PICKED_UP">Picked Up</option>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Label (Optional)</label>
                    <input
                      type="text"
                      value={actionData.eventLabel || ''}
                      onChange={(e) => setActionData({ ...actionData, eventLabel: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300"
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                </div>
              )}

              {action === 'assign_driver' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver ID</label>
                  <input
                    type="text"
                    value={actionData.driverId || ''}
                    onChange={(e) => setActionData({ ...actionData, driverId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Enter driver ID"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Note: Driver selection UI coming soon</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setAction('')
                    setActionData({})
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAction}
                  disabled={isProcessing || !action}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Execute'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


