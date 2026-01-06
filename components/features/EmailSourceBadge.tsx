// Email Source Badge Component
// Displays a badge indicating the load came from email

import React from 'react'

interface EmailSourceBadgeProps {
  className?: string
}

export default function EmailSourceBadge({ className = '' }: EmailSourceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-purple-100 text-purple-800 ${className}`}
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      From Email
    </span>
  )
}


