'use client'

/**
 * Client-side auth helper
 * Replaces localStorage.getItem('driver'|'shipper'|'admin')
 * 
 * Usage:
 *   const { user, isLoading } = await getClientAuth()
 *   if (!user) { redirect('/login') }
 */
export async function getClientAuth(): Promise<{
  user: { userType: string; [key: string]: any } | null
  isLoading: boolean
}> {
  try {
    const response = await fetch('/api/auth/check', {
      credentials: 'include', // Include cookies
    })
    
    if (!response.ok) {
      return { user: null, isLoading: false }
    }

    const data = await response.json()
    
    if (data.authenticated && data.user) {
      return { user: data.user, isLoading: false }
    }
    
    return { user: null, isLoading: false }
  } catch (error) {
    console.error('Error checking auth:', error)
    return { user: null, isLoading: false }
  }
}


