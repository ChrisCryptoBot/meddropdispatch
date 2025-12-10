'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if admin is logged in
    const admin = localStorage.getItem('admin')
    if (admin) {
      router.push('/admin/loads')
    } else {
      router.push('/admin/login')
    }
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  )
}
