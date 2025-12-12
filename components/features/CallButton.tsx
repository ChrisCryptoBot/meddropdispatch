// Call Button Component
// Opens phone dialer with shipper's phone number

import React from 'react'

interface CallButtonProps {
  phoneNumber: string
  label?: string
  className?: string
}

export default function CallButton({
  phoneNumber,
  label = 'Call Shipper',
  className = '',
}: CallButtonProps) {
  const handleCall = () => {
    window.location.href = `tel:${phoneNumber}`
  }

  return (
    <button
      onClick={handleCall}
      className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${className}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
      {label}
    </button>
  )
}


