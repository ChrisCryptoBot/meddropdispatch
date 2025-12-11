'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { LOAD_STATUS_LABELS, LOAD_STATUS_COLORS } from '@/lib/constants'
import type { LoadStatus } from '@/lib/types'
import SearchBar from '@/components/features/SearchBar'
import BulkActions from '@/components/features/BulkActions'

async function getLoads() {
  const loads = await prisma.loadRequest.findMany({
    include: {
      shipper: true,
      pickupFacility: true,
      dropoffFacility: true,
      _count: {
        select: {
          trackingEvents: true,
          documents: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100, // Limit for now
  })

  return loads
}

export default async function AdminLoadsPage() {
  const loads = await getLoads()

  // Group loads by status
  const activeStatuses = ['NEW', 'QUOTED', 'QUOTE_ACCEPTED', 'SCHEDULED', 'PICKED_UP', 'IN_TRANSIT']
  const activeLoads = filteredLoads.filter((load) => activeStatuses.includes(load.status))
  const completedLoads = filteredLoads.filter((load) => ['DELIVERED', 'COMPLETED'].includes(load.status))
  const cancelledLoads = filteredLoads.filter((load) => load.status === 'CANCELLED')

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading loads...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Load Requests</h1>
        <p className="text-gray-600">Manage and track all courier requests</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Loads</p>
              <p className="text-3xl font-bold text-primary-700">{activeLoads.length}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-green-700">{completedLoads.length}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">New Requests</p>
              <p className="text-3xl font-bold text-blue-700">
                {loads.filter((l) => l.status === 'NEW').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Loads</p>
              <p className="text-3xl font-bold text-gray-700">{loads.length}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-700 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Loads Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tracking Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Shipper
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Quote
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLoads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-lg font-medium">No load requests yet</p>
                      <p className="text-sm">New requests will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : (
                loads.map((load) => (
                  <tr key={load.id} className="hover:bg-white/40 transition-base">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/loads/${load.id}`}
                        className="font-mono font-semibold text-primary-700 hover:text-primary-800"
                      >
                        {load.publicTrackingCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-800">{load.shipper.companyName}</div>
                      <div className="text-xs text-gray-500">{load.shipper.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {load.serviceType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">
                        {load.pickupFacility.city}, {load.pickupFacility.state}
                        <span className="text-gray-400 mx-2">→</span>
                        {load.dropoffFacility.city}, {load.dropoffFacility.state}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${LOAD_STATUS_COLORS[load.status as LoadStatus]}`}>
                        {LOAD_STATUS_LABELS[load.status as LoadStatus]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {load.quoteAmount ? (
                        <span className="text-sm font-semibold text-gray-800">
                          ${load.quoteAmount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(load.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/loads/${load.id}`}
                        className="text-primary-600 hover:text-primary-800 font-medium text-sm"
                      >
                        View Details →
                      </Link>
                    </td>
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
