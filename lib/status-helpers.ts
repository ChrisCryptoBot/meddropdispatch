// Status and Priority Color Helpers
// Utility functions for getting status colors, priority indicators, and service type colors

import type { LoadStatus } from './types'
import { LOAD_STATUS_COLORS, SERVICE_TYPE_COLORS } from './constants'

/**
 * Get status color classes for a load status
 */
export function getStatusColor(status: LoadStatus | string): string {
  return LOAD_STATUS_COLORS[status as LoadStatus] || 'bg-gray-50 text-gray-700 border-gray-200 border-2'
}

/**
 * Get priority color for service type
 */
export function getPriorityColor(serviceType: string | null | undefined): string {
  if (!serviceType) return 'bg-gray-400'
  return SERVICE_TYPE_COLORS[serviceType] || SERVICE_TYPE_COLORS.OTHER
}

/**
 * Check if service type is STAT or CRITICAL_STAT
 */
export function isSTAT(serviceType: string | null | undefined): boolean {
  return serviceType === 'STAT' || serviceType === 'CRITICAL_STAT'
}

/**
 * Get status badge classes with enhanced styling
 */
export function getStatusBadgeClasses(status: LoadStatus | string): string {
  const baseColor = getStatusColor(status)
  return `status-badge ${baseColor}`
}

/**
 * Get priority indicator bar color
 */
export function getPriorityBarColor(serviceType: string | null | undefined): string {
  const color = getPriorityColor(serviceType)
  return `w-1.5 h-full ${color}`
}

