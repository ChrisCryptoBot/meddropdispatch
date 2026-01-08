'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { showToast, showApiError } from '@/lib/toast'
import { EmptyState } from '@/components/ui/EmptyState'

interface BlockedEmail {
  id: string
  email: string
  reason: string | null
  blockedBy: string | null
  blockedAt: string
  isActive: boolean
}

export default function BlockedEmailsPage() {
  const router = useRouter()
  const [blockedEmails, setBlockedEmails] = useState<BlockedEmail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<BlockedEmail | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    reason: '',
  })
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const adminData = localStorage.getItem('admin')
    if (!adminData) {
      router.push('/admin/login')
      return
    }

    fetchBlockedEmails()
  }, [router])

  const fetchBlockedEmails = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/blocked-emails')
      if (!response.ok) throw new Error('Failed to fetch blocked emails')

      const data = await response.json()
      setBlockedEmails(data.blockedEmails || [])
    } catch (error) {
      console.error('Error fetching blocked emails:', error)
      showApiError(error, 'Failed to load blocked emails')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.email.trim()) {
      showToast.error('Email address is required')
      return
    }

    try {
      const response = await fetch('/api/blocked-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          reason: formData.reason.trim() || undefined,
        }),
      })

      if (response.ok) {
        await fetchBlockedEmails()
        setShowAddModal(false)
        setFormData({ email: '', reason: '' })
        showToast.success('Email blocked successfully')
      } else {
        const data = await response.json()
        throw new Error(data.message || 'Failed to block email')
      }
    } catch (error) {
      console.error('Error blocking email:', error)
      showApiError(error, 'Failed to block email')
    }
  }

  const handleEdit = async () => {
    if (!selectedEmail || !formData.reason.trim()) {
      showToast.error('Reason is required')
      return
    }

    try {
      const response = await fetch(`/api/blocked-emails/${selectedEmail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: formData.reason.trim(),
        }),
      })

      if (response.ok) {
        await fetchBlockedEmails()
        setShowEditModal(false)
        setSelectedEmail(null)
        setFormData({ email: '', reason: '' })
        showToast.success('Blocked email updated successfully')
      } else {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update blocked email')
      }
    } catch (error) {
      console.error('Error updating blocked email:', error)
      showApiError(error, 'Failed to update blocked email')
    }
  }

  const handleToggleActive = async (email: BlockedEmail) => {
    try {
      const response = await fetch(`/api/blocked-emails/${email.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !email.isActive,
        }),
      })

      if (response.ok) {
        await fetchBlockedEmails()
        showToast.success(`Email ${email.isActive ? 'unblocked' : 'blocked'} successfully`)
      } else {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update email status')
      }
    } catch (error) {
      console.error('Error toggling email status:', error)
      showApiError(error, 'Failed to update email status')
    }
  }

  const handleDelete = async (email: BlockedEmail) => {
    if (!confirm(`Are you sure you want to permanently delete the block for ${email.email}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/blocked-emails/${email.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchBlockedEmails()
        showToast.success('Blocked email deleted successfully')
      } else {
        const data = await response.json()
        throw new Error(data.message || 'Failed to delete blocked email')
      }
    } catch (error) {
      console.error('Error deleting blocked email:', error)
      showApiError(error, 'Failed to delete blocked email')
    }
  }

  const filteredEmails = blockedEmails.filter((email) => {
    if (filter === 'active' && !email.isActive) return false
    if (filter === 'inactive' && email.isActive) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        email.email.toLowerCase().includes(query) ||
        (email.reason && email.reason.toLowerCase().includes(query))
      )
    }
    return true
  })

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading blocked emails...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header - Gold Standard Sticky */}
      <div className="sticky top-0 z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tight">
              Blocked Emails
            </h1>
            <p className="text-slate-400 text-sm md:text-base">Manage DNU (Do Not Use) email list</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all shadow-lg shadow-cyan-500/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Block Email
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-primary p-4 rounded-xl mb-6 border border-slate-700/50 shadow-lg">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by email or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Blocked Emails List */}
      {filteredEmails.length === 0 ? (
        <div className="glass-primary rounded-xl p-12 text-center border border-slate-700/50 shadow-lg">
          <EmptyState
            portal="admin"
            title={searchQuery || filter !== 'all' ? 'No blocked emails match your filters' : 'No blocked emails'}
            description={searchQuery || filter !== 'all' ? 'Try adjusting your search or filter criteria' : 'Blocked emails will appear here'}
          />
        </div>
      ) : (
        <div className="glass-primary rounded-xl overflow-hidden border border-slate-700/50 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Blocked At</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono font-semibold text-white">{email.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300">{email.reason || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {formatDate(email.blockedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        email.isActive
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}>
                        {email.isActive ? 'Blocked' : 'Unblocked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedEmail(email)
                            setFormData({ email: email.email, reason: email.reason || '' })
                            setShowEditModal(true)
                          }}
                          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleActive(email)}
                          className={`p-2 rounded-lg transition-colors ${
                            email.isActive
                              ? 'text-green-400 hover:bg-green-500/10'
                              : 'text-red-400 hover:bg-red-500/10'
                          }`}
                          title={email.isActive ? 'Unblock' : 'Block'}
                        >
                          {email.isActive ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(email)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setShowAddModal(false)}
        >
          <div className="glass-primary rounded-xl p-8 max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4 font-heading">Block Email</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Reason (Optional)</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500 resize-none"
                  placeholder="Reason for blocking this email..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setFormData({ email: '', reason: '' })
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 transition-colors border border-slate-600/50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!formData.email.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-red-500/50 transition-all disabled:opacity-50 shadow-lg shadow-red-500/30"
              >
                Block Email
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEmail && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setShowEditModal(false)}
        >
          <div className="glass-primary rounded-xl p-8 max-w-md w-full border border-slate-700/50 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-4 font-heading">Edit Blocked Email</h2>
            <p className="text-slate-400 mb-6">
              Email: <span className="font-mono font-bold text-white">{selectedEmail.email}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Reason *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-600/50 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none bg-slate-800/50 text-slate-200 placeholder:text-slate-500 resize-none"
                  placeholder="Reason for blocking this email..."
                  required
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedEmail(null)
                  setFormData({ email: '', reason: '' })
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg font-semibold hover:bg-slate-700/70 transition-colors border border-slate-600/50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={!formData.reason.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-cyan-500/50 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/30"
              >
                Update
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

