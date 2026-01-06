'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { getButtonClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  portal?: 'driver' | 'shipper' | 'admin'
  isLoading?: boolean
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'medium',
  portal = 'driver',
  isLoading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = getButtonClasses(variant, portal, size)
  
  return (
    <button
      className={cn(baseClasses, className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
