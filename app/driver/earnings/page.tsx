'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

interface EarningsData {
  weekly: {
    total: number
    loads: number
    average: number
  }
  monthly: {
    total: number
    loads: number
    average: number
  }
  pending: number
  paid: number
}

interface LoadSummary {
  id: string
  publicTrackingCode: string
  status: string
  quoteAmount: number | null
  driverQuoteAmount: number | null
  shipperPaymentStatus: string | null
  shipperPaidAt: string | null
  actualDeliveryTime: string | null
  shipper: {
    companyName: string
  }
}

export default function DriverEarningsPage() {
  const router = useRouter()
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [loads, setLoads] = useState<LoadSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const authResponse = await fetch('/api/auth/check', {
          credentials: 'include'
        })
        
        if (!authResponse.ok) {
          router.push('/driver/login')
          return
        }

        const authData = await authResponse.json()
        
        if (!authData.authenticated || authData.user?.userType !== 'driver') {
          router.push('/driver/login')
          return
        }

        await Promise.all([
          fetchEarnings(authData.user.id),
          fetchLoads(authData.user.id)
        ])
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load earnings data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [router])

  const fetchEarnings = async (driverId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/drivers/${driverId}/earnings`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/driver/login')
          return
        }
        throw new Error('Failed to fetch earnings')
      }

      const data = await response.json()
      setEarnings(data)
    } catch (err) {
      console.error('Error fetching earnings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load earnings')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLoads = async (driverId: string) => {
    try {
      const response = await fetch(`/api/drivers/${driverId}/my-loads?status=DELIVERED,COMPLETED`, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        setLoads(data.loads || [])
      }
    } catch (err) {
      console.error('Error fetching loads:', err)
    }
  }

  const filteredLoads = loads.filter(load => {
    if (filter === 'all') return true
    if (filter === 'completed') return load.shipperPaymentStatus === 'PAID'
    if (filter === 'pending') return load.shipperPaymentStatus !== 'PAID'
    return true
  })

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-500/20 text-green-400 border border-green-500/30'
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
      default:
        return 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-slate-300">Loading earnings...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <div className="glass-primary rounded-xl p-8 text-center">
          <p className="text-urgent-700 mb-4">{error}</p>
          <button
            onClick={async () => {
              try {
                setIsLoading(true)
                setError(null)
                const authResponse = await fetch('/api/auth/check', {
                  credentials: 'include'
                })
                if (authResponse.ok) {
                  const authData = await authResponse.json()
                  if (authData.authenticated && authData.user?.userType === 'driver') {
                    await Promise.all([
                      fetchEarnings(authData.user.id),
                      fetchLoads(authData.user.id)
                    ])
                  }
                }
              } catch (err) {
                setError('Failed to load earnings data')
              } finally {
                setIsLoading(false)
              }
            }}
            className="px-4 py-2 bg-gradient-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8">
      {/* Header */}
      <div className="sticky top-[100px] z-[55] mb-6 bg-slate-900/95 backdrop-blur-sm -mx-6 md:-mx-8 px-6 md:px-8 pt-4 pb-6 border-b border-slate-700/50">
        <Link
          href="/driver/dashboard"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-3 transition-colors group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back to Load Board</span>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mb-5 pb-2 tracking-tight leading-tight">
          Earnings Summary
        </h1>
        <p className="text-slate-400 leading-normal">Track your earnings and payment status</p>
      </div>

      {earnings && (
        <>
          {/* Earnings Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <p className="text-slate-400 text-sm mb-1">Total Earnings</p>
              <p className="text-2xl font-bold text-white font-data">
                {formatCurrency(earnings.monthly.total + earnings.paid)}
              </p>
              <p className="text-xs text-slate-500 mt-1">All time</p>
            </div>
            <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <p className="text-slate-400 text-sm mb-1">This Month</p>
              <p className="text-2xl font-bold text-white font-data">
                {formatCurrency(earnings.monthly.total)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{earnings.monthly.loads} loads</p>
            </div>
            <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <p className="text-slate-400 text-sm mb-1">This Week</p>
              <p className="text-2xl font-bold text-white font-data">
                {formatCurrency(earnings.weekly.total)}
              </p>
              <p className="text-xs text-slate-500 mt-1">{earnings.weekly.loads} loads</p>
            </div>
            <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <p className="text-slate-400 text-sm mb-1">Pending Payment</p>
              <p className="text-2xl font-bold text-yellow-400 font-data">
                {formatCurrency(earnings.pending)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Awaiting payment</p>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Weekly Breakdown</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total</span>
                  <span className="text-xl font-bold text-white font-data">
                    {formatCurrency(earnings.weekly.total)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Completed Loads</span>
                  <span className="text-lg font-semibold text-white">{earnings.weekly.loads}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Average per Load</span>
                  <span className="text-lg font-semibold text-white font-data">
                    {formatCurrency(earnings.weekly.average)}
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Monthly Breakdown</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total</span>
                  <span className="text-xl font-bold text-white font-data">
                    {formatCurrency(earnings.monthly.total)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Completed Loads</span>
                  <span className="text-lg font-semibold text-white">{earnings.monthly.loads}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Average per Load</span>
                  <span className="text-lg font-semibold text-white font-data">
                    {formatCurrency(earnings.monthly.average)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Completed Loads List */}
      <div className="glass-primary rounded-xl p-6 border border-slate-700/50 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Completed Loads</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                filter === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Pending
            </button>
          </div>
        </div>

        {filteredLoads.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-400 text-lg mb-2">No completed loads found</p>
            <p className="text-slate-500 text-sm">Completed loads will appear here once delivered</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLoads.map((load) => (
              <div
                key={load.id}
                className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-mono font-bold text-cyan-400 text-lg font-data">
                        {load.publicTrackingCode}
                      </p>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(load.shipperPaymentStatus)}`}>
                        {load.shipperPaymentStatus || 'PENDING'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-1">{load.shipper.companyName}</p>
                    {load.actualDeliveryTime && (
                      <p className="text-xs text-slate-500">
                        Delivered: {formatDate(load.actualDeliveryTime)}
                      </p>
                    )}
                    {load.shipperPaidAt && (
                      <p className="text-xs text-green-400 mt-1">
                        Paid: {formatDate(load.shipperPaidAt)}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-white font-data">
                      {formatCurrency(load.driverQuoteAmount || load.quoteAmount || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

