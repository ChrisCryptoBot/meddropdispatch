'use client'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  
  /**
   * Optional text label below spinner
   */
  label?: string
  
  /**
   * Portal context for styling
   * @default 'default'
   */
  portal?: 'driver' | 'shipper' | 'admin' | 'default'
  
  /**
   * Full screen overlay
   * @default false
   */
  fullScreen?: boolean
  
  /**
   * Additional className
   */
  className?: string
}

/**
 * Reusable Loading Spinner Component
 * 
 * Replaces ad-hoc loading spinners throughout the app with a consistent,
 * accessible, and portal-aware component.
 * 
 * @example
 * ```tsx
 * // Simple spinner
 * <LoadingSpinner />
 * 
 * // With label
 * <LoadingSpinner label="Loading loads..." />
 * 
 * // Portal-specific styling
 * <LoadingSpinner portal="driver" size="large" />
 * 
 * // Full screen overlay
 * <LoadingSpinner fullScreen label="Loading..." />
 * ```
 */
export function LoadingSpinner({
  size = 'medium',
  label,
  portal = 'default',
  fullScreen = false,
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16',
  }

  const borderWidth = {
    small: 'border-2',
    medium: 'border-2',
    large: 'border-4',
  }

  const portalColors = {
    driver: 'border-accent-600',
    shipper: 'border-primary-600',
    admin: 'border-blue-600',
    default: 'border-gray-600',
  }

  const spinner = (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        fullScreen && 'min-h-screen',
        className
      )}
      role="status"
      aria-label={label || 'Loading'}
    >
      <div
        className={cn(
          'animate-spin rounded-full',
          sizeClasses[size],
          borderWidth[size],
          portalColors[portal],
          'border-t-transparent'
        )}
        aria-hidden="true"
      />
      {label && (
        <p
          className={cn(
            'mt-4 text-sm font-medium',
            portal === 'driver' && 'text-accent-700',
            portal === 'shipper' && 'text-primary-700',
            portal === 'admin' && 'text-blue-700',
            portal === 'default' && 'text-gray-600'
          )}
        >
          {label}
        </p>
      )}
      <span className="sr-only">{label || 'Loading'}</span>
    </div>
  )

  return spinner
}

/**
 * Inline loading spinner for use within components
 */
export function InlineSpinner({ size = 'small', className }: { size?: 'small' | 'medium' | 'large'; className?: string }) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-6 w-6',
    large: 'h-8 w-8',
  }

  return (
    <div
      className={cn('animate-spin rounded-full border-2 border-current border-t-transparent', sizeClasses[size], className)}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading</span>
    </div>
  )
}










