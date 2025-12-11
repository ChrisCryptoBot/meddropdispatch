// Driver Authentication Hook
// Specific hook for driver authentication

import { useAuth } from './useAuth'
import { getDriver, setDriver, removeDriver } from '@/lib/storage'

export function useDriverAuth() {
  const { user, isLoading, isAuthenticated } = useAuth({
    userType: 'driver',
    redirectTo: '/driver/login',
  })

  return {
    driver: user,
    isLoading,
    isAuthenticated,
    // Convenience methods
    getDriver,
    setDriver,
    removeDriver,
  }
}

