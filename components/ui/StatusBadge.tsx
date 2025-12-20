'use client'

import { HTMLAttributes } from 'react'
import { LOAD_STATUS_COLORS, LOAD_STATUS_LABELS } from '@/lib/constants'
import type { LoadStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: LoadStatus
  size?: 'small' | 'medium'
}

const badgeSizes = {
  small: 'px-2 py-0.5 text-xs',
  medium: 'px-3 py-1 text-xs',
}

export default function StatusBadge({
  status,
  size = 'medium',
  className,
  ...props
}: StatusBadgeProps) {
  const statusColor = LOAD_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 border-gray-200 border-2'
  const statusLabel = LOAD_STATUS_LABELS[status] || status

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border-2',
        statusColor,
        badgeSizes[size],
        className
      )}
      {...props}
    >
      {statusLabel}
    </span>
  )
}

