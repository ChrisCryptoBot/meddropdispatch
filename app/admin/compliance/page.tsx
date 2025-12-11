'use client'

// Admin Compliance Page
// View all compliance reminders

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ComplianceReminder {
  id: string
  type: string
  entityId: string
  entityType: string
  title: string
  description: string
  expiryDate: string
  daysUntilExpiry: number
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
}

export default function AdminCompliancePage() {
  const router = useRouter()
  const [reminders, setReminders] = useState<ComplianceReminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const adminData = localStorage.getItem('admin')
    if (!adminData) {
      router.push('/admin/login')
      return
    }
    fetchReminders()
  }, [router, filter])

  const fetchReminders = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/compliance/reminders')
      if (response.ok) {
        const data = await response.json()
        let filtered = data.reminders || []
        if (filter !== 'all') {
          filtered = filtered.filter((r: ComplianceReminder) => r.severity === filter)
        }
        setReminders(filtered)
      }
    } catch (error) {
      console.error('Error fetching compliance reminders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading compliance reminders...</p>
        </div>
      </div>
    )
  }

  const stats = {
    total: reminders.length,
    critical: reminders.filter((r) => r.severity === 'CRITICAL').length,
    warnings: reminders.filter((r) => r.severity === 'WARNING').length,
    info: reminders.filter((r) => r.severity === 'INFO').length,
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Compliance Reminders</h1>
        <p className="text-gray-600">Track driver certifications, licenses, and compliance requirements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass p-6 rounded-xl">
          <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Reminders</div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="text-3xl font-bold text-red-600 mb-1">{stats.critical}</div>
          <div className="text-sm text-gray-600">Critical</div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="text-3xl font-bold text-yellow-600 mb-1">{stats.warnings}</div>
          <div className="text-sm text-gray-600">Warnings</div>
        </div>
        <div className="glass p-6 rounded-xl">
          <div className="text-3xl font-bold text-blue-600 mb-1">{stats.info}</div>
          <div className="text-sm text-gray-600">Info</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-4 rounded-xl mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>

      {/* Reminders List */}
      {reminders.length === 0 ? (
        <div className="glass p-12 rounded-2xl text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-bold text-gray-900 mb-2">All Clear!</h3>
          <p className="text-gray-600">No compliance reminders at this time</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`glass p-6 rounded-xl border ${
                reminder.severity === 'CRITICAL'
                  ? 'border-red-200 bg-red-50/50'
                  : reminder.severity === 'WARNING'
                  ? 'border-yellow-200 bg-yellow-50/50'
                  : 'border-blue-200 bg-blue-50/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{reminder.title}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        reminder.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : reminder.severity === 'WARNING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {reminder.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Type: {reminder.type.replace(/_/g, ' ')}</span>
                    {reminder.daysUntilExpiry > 0 && (
                      <span>
                        Expires in: {reminder.daysUntilExpiry} day{reminder.daysUntilExpiry !== 1 ? 's' : ''}
                      </span>
                    )}
                    {reminder.daysUntilExpiry <= 0 && (
                      <span className="text-red-600 font-medium">
                        Overdue by: {Math.abs(reminder.daysUntilExpiry)} day{Math.abs(reminder.daysUntilExpiry) !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span>Expiry: {new Date(reminder.expiryDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


