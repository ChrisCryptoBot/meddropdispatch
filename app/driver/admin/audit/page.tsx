'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId?: string
  userId?: string
  userType?: string
  userEmail?: string
  ipAddress?: string
  changes?: string
  metadata?: string
  severity: string
  success: boolean
  errorMessage?: string
  createdAt: string
}

export default function AuditLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState({
    action: 'all',
    entityType: 'all',
    severity: 'all',
    success: 'all',
  })
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Get driver from API auth check (httpOnly cookie) - layout handles redirects
    const fetchDriverData = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        if (!response.ok) {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const data = await response.json()
        if (!data.authenticated || data.user?.userType !== 'driver') {
          setIsLoading(false)
          return // Layout will handle redirect
        }
        
        const adminMode = localStorage.getItem('driverAdminMode') === 'true'
        
        if (!data.user.isAdmin || !adminMode) {
          setIsLoading(false)
          router.push('/driver/dashboard')
          return
        }
        
        fetchAuditLogs()
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  const fetchAuditLogs = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filter.action !== 'all' && log.action !== filter.action) return false
    if (filter.entityType !== 'all' && log.entityType !== filter.entityType) return false
    if (filter.severity !== 'all' && log.severity !== filter.severity) return false
    if (filter.success !== 'all') {
      const successFilter = filter.success === 'true'
      if (log.success !== successFilter) return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!log.userEmail?.toLowerCase().includes(query) &&
          !log.action.toLowerCase().includes(query) &&
          !log.entityType.toLowerCase().includes(query) &&
          !log.errorMessage?.toLowerCase().includes(query)) {
        return false
      }
    }
    return true
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200'
      case 'ERROR': return 'text-red-600 bg-red-50 border-red-200'
      case 'WARNING': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading audit logs...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Audit Logs</h1>
        <p className="text-gray-600">Complete audit trail of all system actions</p>
      </div>

      {/* Filters */}
      <div className="glass-primary p-4 rounded-xl mb-6 border-2 border-blue-200/30 shadow-glass">
        <div className="grid md:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by user, action, entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <select
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="VIEW">View</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type</label>
            <select
              value={filter.entityType}
              onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            >
              <option value="all">All Types</option>
              <option value="LOAD_REQUEST">Load Request</option>
              <option value="DRIVER">Driver</option>
              <option value="SHIPPER">Shipper</option>
              <option value="INVOICE">Invoice</option>
              <option value="DOCUMENT">Document</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={filter.severity}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="ERROR">Error</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Success</label>
            <select
              value={filter.success}
              onChange={(e) => setFilter({ ...filter, success: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            >
              <option value="all">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-primary rounded-2xl overflow-hidden border-2 border-blue-200/30 shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/40">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {log.userEmail || 'System'}
                      {log.userType && (
                        <span className="text-xs text-gray-500 ml-1">({log.userType})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.action}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {log.entityType}
                      {log.entityId && (
                        <span className="text-xs text-gray-500 ml-1">({log.entityId.slice(0, 8)}...)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getSeverityColor(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="text-green-600 text-sm">✓ Success</span>
                      ) : (
                        <span className="text-red-600 text-sm">✗ Failed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{log.ipAddress || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


