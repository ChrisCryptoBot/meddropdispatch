// Shipper Authentication Hook
// Specific hook for shipper authentication

import { useAuth } from './useAuth'
import { getShipper, setShipper, removeShipper } from '@/lib/storage'

export function useShipperAuth() {
  const { user, isLoading, isAuthenticated } = useAuth()

  return {
    shipper: user,
    isLoading,
    isAuthenticated,
    // Convenience methods
    getShipper,
    setShipper,
    removeShipper,
  }
}




