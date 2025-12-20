'use client'

// Shipper Templates Page
// Manage recurring load templates

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    const shipperData = localStorage.getItem('shipper')
    if (!shipperData) {
      router.push('/shipper/login')
      return
    }
    setShipper(JSON.parse(shipperData))
    fetchTemplates()
  }, [router])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const shipperData = localStorage.getItem('shipper')
      if (!shipperData) return

      const shipper = JSON.parse(shipperData)
      const response = await fetch(`/api/load-templates?shipperId=${shipper.id}`)
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

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/load-templates/${templateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchTemplates()
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
    <div className="p-8 print:p-4">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gradient-medical-bg backdrop-blur-sm pt-[73px] pb-4 mb-8 print:mb-4 print:static print:pt-8 print:top-0 border-b border-blue-200/30 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">Load Templates</h1>
            <p className="text-gray-600 print:text-sm">Save and reuse common load configurations</p>
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
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

