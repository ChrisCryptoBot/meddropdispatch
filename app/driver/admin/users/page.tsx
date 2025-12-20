'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { showToast, showApiError } from '@/lib/toast'

interface User {
  id: string
  email: string
  userType: 'DRIVER' | 'SHIPPER' | 'ADMIN'
  firstName?: string
  lastName?: string
  companyName?: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
}

export default function UserActivityPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showImpersonateModal, setShowImpersonateModal] = useState(false)

  useEffect(() => {
    const driverData = localStorage.getItem('driver')
    const adminMode = localStorage.getItem('driverAdminMode') === 'true'
    
    if (!driverData || !adminMode) {
      router.push('/driver/login')
      return
    }

    fetchUsers()
  }, [router])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImpersonate = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/impersonate`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        showToast.success(`Impersonating ${selectedUser.email}`)
        
        // Store impersonation token and redirect
        if (selectedUser.userType === 'SHIPPER') {
          localStorage.setItem('shipper', JSON.stringify(data.user))
          router.push('/shipper/dashboard')
        } else if (selectedUser.userType === 'DRIVER') {
          localStorage.setItem('driver', JSON.stringify(data.user))
          router.push('/driver/dashboard')
        }
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to impersonate user')
      }
    } catch (error) {
      showApiError(error, 'Failed to impersonate user')
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">User Activity</h1>
        <p className="text-gray-600">View user activity and impersonate users for debugging</p>
      </div>

      {/* Users Table */}
      <div className="glass-primary rounded-2xl overflow-hidden border-2 border-blue-200/30 shadow-glass">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/40">
                    <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                        {user.userType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.companyName || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="text-green-600 text-sm">Active</span>
                      ) : (
                        <span className="text-red-600 text-sm">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowImpersonateModal(true)
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Impersonate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Impersonate Modal */}
      {showImpersonateModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Impersonate User</h2>
            <p className="text-gray-600 mb-4">
              You are about to log in as <strong>{selectedUser.email}</strong> ({selectedUser.userType}).
            </p>
            <p className="text-sm text-yellow-600 mb-6 bg-yellow-50 p-3 rounded-lg">
              ⚠️ This action will be logged in the audit trail. Use only for debugging shipper issues.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleImpersonate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Confirm Impersonate
              </button>
              <button
                onClick={() => {
                  setShowImpersonateModal(false)
                  setSelectedUser(null)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

