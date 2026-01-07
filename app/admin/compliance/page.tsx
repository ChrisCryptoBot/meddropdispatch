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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading compliance reminders...</p>
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
    <div className="p-6 md:p-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-[85px] z-[55] mb-6 pb-2">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
          Compliance Reminders
        </h1>
        <p className="text-slate-400">Track driver certifications, licenses, and compliance requirements</p>
      </div>

      {/* Stats - Gold Standard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-cyan-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{stats.total}</p>
            <p className="text-sm text-slate-400 font-medium">Total Reminders</p>
          </div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-red-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{stats.critical}</p>
            <p className="text-sm text-slate-400 font-medium">Critical</p>
          </div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-yellow-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{stats.warnings}</p>
            <p className="text-sm text-slate-400 font-medium">Warnings</p>
          </div>
        </div>
        <div className="glass-primary rounded-xl p-5 border border-slate-700/50 shadow-lg hover:border-blue-500/50 transition-all">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-1 font-data">{stats.info}</p>
            <p className="text-sm text-slate-400 font-medium">Info</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-primary p-4 rounded-xl mb-6 border border-slate-700/50 shadow-lg">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-300">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-600/50 bg-slate-800/50 text-slate-200 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
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
        <div className="glass-primary p-12 rounded-xl text-center border border-slate-700/50 shadow-lg">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">All Clear!</h3>
          <p className="text-slate-400">No compliance reminders at this time</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`glass-primary p-6 rounded-xl border shadow-lg ${
                reminder.severity === 'CRITICAL'
                  ? 'border-red-500/30 bg-red-500/20'
                  : reminder.severity === 'WARNING'
                  ? 'border-yellow-500/30 bg-yellow-500/20'
                  : 'border-blue-500/30 bg-blue-500/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">{reminder.title}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        reminder.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : reminder.severity === 'WARNING'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {reminder.severity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{reminder.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Type: {reminder.type.replace(/_/g, ' ')}</span>
                    {reminder.daysUntilExpiry > 0 && (
                      <span>
                        Expires in: {reminder.daysUntilExpiry} day{reminder.daysUntilExpiry !== 1 ? 's' : ''}
                      </span>
                    )}
                    {reminder.daysUntilExpiry <= 0 && (
                      <span className="text-red-400 font-medium">
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


