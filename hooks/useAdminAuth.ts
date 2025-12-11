// Admin Authentication Hook
// Specific hook for admin authentication

import { useAuth } from './useAuth'
import { getAdmin, setAdmin, removeAdmin } from '@/lib/storage'

export function useAdminAuth() {
  const { user, isLoading, isAuthenticated } = useAuth({
    userType: 'admin',
    redirectTo: '/admin/login',
  })

  return {
    admin: user,
    isLoading,
    isAuthenticated,
    // Convenience methods
    getAdmin,
    setAdmin,
    removeAdmin,
  }
}



