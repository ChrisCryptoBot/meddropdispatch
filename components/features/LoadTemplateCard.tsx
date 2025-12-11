// Load Template Card Component
// Displays a load template with quick actions

import React from 'react'
import Link from 'next/link'

interface LoadTemplate {
  id: string
  name: string
  serviceType: string
  commodityDescription: string
  readyTime?: string
  deliveryDeadline?: string
  isActive: boolean
  pickupFacility: {
    name: string
    city: string
    state: string
  }
  dropoffFacility: {
    name: string
    city: string
    state: string
  }
  createdAt: string
}

interface LoadTemplateCardProps {
  template: LoadTemplate
  onBook?: (templateId: string) => void
  onEdit?: (templateId: string) => void
  onDelete?: (templateId: string) => void
}

export default function LoadTemplateCard({
  template,
  onBook,
  onEdit,
  onDelete,
}: LoadTemplateCardProps) {
  const route = `${template.pickupFacility.city}, ${template.pickupFacility.state} → ${template.dropoffFacility.city}, ${template.dropoffFacility.state}`

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{template.name}</h3>
          <p className="text-sm text-gray-600">{route}</p>
        </div>
        {!template.isActive && (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
            Inactive
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Service:</span>
          <span className="font-medium text-gray-900">{template.serviceType.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Commodity:</span>
          <span className="font-medium text-gray-900">{template.commodityDescription}</span>
        </div>
        {template.readyTime && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Ready Time:</span>
            <span className="font-medium text-gray-900">{template.readyTime}</span>
          </div>
        )}
        {template.deliveryDeadline && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Deadline:</span>
            <span className="font-medium text-gray-900">{template.deliveryDeadline}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
        {onBook && (
          <button
            onClick={() => onBook(template.id)}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Book Now
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(template.id)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(template.id)}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

