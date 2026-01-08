'use client'

// Shipper Templates Page
// Manage recurring load templates

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LoadTemplateCard from '@/components/features/LoadTemplateCard'
import { showToast, showApiError } from '@/lib/toast'

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

export default function ShipperTemplatesPage() {
  const router = useRouter()
  const [shipper, setShipper] = useState<any>(null)
  const [templates, setTemplates] = useState<LoadTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<LoadTemplate | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    isActive: true,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Get shipper from API auth check (httpOnly cookie) - layout handles redirects
    const fetchShipperData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'shipper') {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        setShipper(data.user)
        fetchTemplates(data.user.id)
      } catch (error) {
        console.error('Error fetching shipper data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchShipperData()
  }, [])

  const fetchTemplates = async (shipperId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/load-templates?shipperId=${shipperId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Re-fetch templates when shipper is available
  useEffect(() => {
    if (shipper?.id) {
      fetchTemplates(shipper.id)
    }
  }, [shipper?.id])

  const handleBook = async (templateId: string) => {
    try {
      const response = await fetch(`/api/load-templates/${templateId}/create-load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const data = await response.json()
        showToast.success('Load created successfully!')
        router.push(`/shipper/loads/${data.loadRequest.id}`)
      } else {
        const error = await response.json()
        showToast.error(error.error || 'Failed to create load')
      }
    } catch (error) {
      console.error('Error creating load from template:', error)
      showToast.error('Failed to create load')
    }
  }

  const handleEdit = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setEditingTemplate(template)
      setEditFormData({
        name: template.name,
        isActive: template.isActive,
      })
      setShowEditModal(true)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingTemplate) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/load-templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      })

      if (response.ok) {
        if (shipper?.id) {
          fetchTemplates(shipper.id)
        }
        setShowEditModal(false)
        setEditingTemplate(null)
        showToast.success('Template updated successfully')
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update template')
      }
    } catch (error) {
      console.error('Error updating template:', error)
      showApiError(error, 'Failed to update template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/load-templates/${templateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        if (shipper?.id) {
          fetchTemplates(shipper.id)
        }
        showToast.success('Template deleted successfully')
      } else {
        showToast.error('Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      showToast.error('Failed to delete template')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 print:p-4">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight print:text-2xl">Load Templates</h1>
            <p className="text-slate-400 text-sm md:text-base print:text-sm">Save and reuse common load configurations</p>
          </div>
          <Link
            href="/shipper/request-load"
            className="px-6 py-3 bg-gradient-primary text-white font-semibold rounded-lg hover:shadow-lg transition-all shadow-glass mr-6"
          >
            Create New Template
          </Link>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 text-lg mb-2">No templates yet</p>
          <p className="text-gray-500 text-sm mb-6">Create templates to quickly book recurring loads</p>
          <Link
            href="/shipper/request-load"
            className="inline-block px-6 py-3 bg-gradient-primary text-white font-semibold rounded-lg hover:shadow-lg transition-all shadow-glass"
          >
            Create Your First Template
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <LoadTemplateCard
              key={template.id}
              template={template}
              onBook={handleBook}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="glass-primary rounded-xl p-8 max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4 font-heading">Edit Template</h2>
            <p className="text-slate-400 mb-6">
              Template: <span className="font-mono font-bold text-white">{editingTemplate.name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Template Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="Template name"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-600/50 bg-slate-800/50 text-cyan-600 focus:ring-cyan-500/50"
                  />
                  <span className="text-sm font-semibold text-slate-300">Active Template</span>
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-8">Inactive templates won't appear in quick booking</p>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingTemplate(null)
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 transition-colors border border-slate-600/50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editFormData.name.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/30"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}


