'use client'

// Admin Dashboard for Drivers with Admin Privileges
// This page is only accessible when admin mode is enabled

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DriverAdminDashboardPage() {
  const router = useRouter()
  const [driver, setDriver] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

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
        
        // Check if driver has admin privileges and admin mode is enabled
        if (!data.user.isAdmin || !adminMode) {
          setIsLoading(false)
          router.push('/driver/dashboard')
          return
        }
        
        setDriver(data.user)
        fetchStats()
      } catch (error) {
        console.error('Error fetching driver data:', error)
        setIsLoading(false)
        // Don't redirect here - let layout handle it
      }
    }
    
    fetchDriverData()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 font-heading">Admin Dashboard</h1>
        <p className="text-slate-400">System-wide overview and management</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Today's Loads</p>
              <p className="text-3xl font-bold text-white font-data">{stats.todayLoads || 0}</p>
            </div>
          </div>

          <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Active Loads</p>
              <p className="text-3xl font-bold text-white font-data">{stats.activeLoads || 0}</p>
            </div>
          </div>

          <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Pending Quotes</p>
              <p className="text-3xl font-bold text-white font-data">{stats.pendingQuotes || 0}</p>
            </div>
          </div>

          <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Completed Today</p>
              <p className="text-3xl font-bold text-white font-data">{stats.completedToday || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="glass-primary p-6 rounded-xl border border-slate-700/50 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/driver/admin/loads"
            className="p-4 glass-primary rounded-lg border border-slate-700/50 hover:border-slate-600/50 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-700/50">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">All Loads</p>
                <p className="text-sm text-slate-400">Manage all load requests</p>
              </div>
            </div>
          </Link>

          <Link
            href="/driver/admin/shippers"
            className="p-4 glass-primary rounded-lg border border-slate-700/50 hover:border-slate-600/50 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-700/50">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Shippers</p>
                <p className="text-sm text-slate-400">Manage shipper accounts</p>
              </div>
            </div>
          </Link>

          <Link
            href="/driver/admin/invoices"
            className="p-4 glass-primary rounded-lg border border-slate-700/50 hover:border-slate-600/50 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800/50 rounded-lg flex items-center justify-center border border-slate-700/50">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Invoices</p>
                <p className="text-sm text-slate-400">Manage all invoices</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}


