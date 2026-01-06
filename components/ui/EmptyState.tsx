'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /**
   * Icon to display (SVG path or React node)
   */
  icon?: React.ReactNode
  
  /**
   * Title text
   */
  title: string
  
  /**
   * Description text
   */
  description?: string
  
  /**
   * Optional action button
   */
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  
  /**
   * Portal context for styling
   * @default 'default'
   */
  portal?: 'driver' | 'shipper' | 'admin' | 'default'
  
  /**
   * Additional className
   */
  className?: string
}

/**
 * Reusable Empty State Component
 * 
 * Standardizes "No data" screens across the application with consistent
 * styling, icons, and optional action buttons.
 * 
 * @example
 * ```tsx
 * // Simple empty state
 * <EmptyState
 *   title="No loads found"
 *   description="You haven't created any loads yet."
 * />
 * 
 * // With action button
 * <EmptyState
 *   title="No invoices"
 *   description="Invoices will appear here once loads are completed."
 *   action={{
 *     label: "View Loads",
 *     href: "/shipper/loads"
 *   }}
 * />
 * 
 * // Portal-specific styling
 * <EmptyState
 *   portal="driver"
 *   title="No loads available"
 *   description="Check back later for new loads."
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  portal = 'default',
  className,
}: EmptyStateProps) {
  const defaultIcon = (
    <svg
      className="w-16 h-16 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  )

  const portalStyles = {
    driver: {
      container: 'glass-accent border-teal-200/30',
      title: 'text-accent-700',
      description: 'text-teal-600',
      button: 'bg-gradient-accent hover:shadow-lg',
    },
    shipper: {
      container: 'glass-primary border-blue-200/30',
      title: 'text-primary-700',
      description: 'text-blue-600',
      button: 'bg-gradient-primary hover:shadow-lg',
    },
    admin: {
      container: 'glass-primary border-blue-200/30',
      title: 'text-blue-700',
      description: 'text-gray-600',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    default: {
      container: 'glass border-gray-200',
      title: 'text-gray-700',
      description: 'text-gray-600',
      button: 'bg-gray-600 hover:bg-gray-700',
    },
  }

  const styles = portalStyles[portal] || portalStyles.default

  const actionButton = action && (
    <div className="mt-6">
      {action.href ? (
        <Link
          href={action.href}
          className={cn(
            'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all',
            styles.button
          )}
        >
          {action.label}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <button
          onClick={action.onClick}
          className={cn(
            'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all',
            styles.button
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  )

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 rounded-2xl text-center',
        styles.container,
        className
      )}
    >
      <div className="mb-4">{icon || defaultIcon}</div>
      <h3 className={cn('text-xl font-bold mb-2', styles.title)}>{title}</h3>
      {description && <p className={cn('text-sm max-w-md', styles.description)}>{description}</p>}
      {actionButton}
    </div>
  )
}

/**
 * Pre-configured empty states for common scenarios
 */
export const EmptyStates = {
  NoLoads: function NoLoads(props: { portal?: 'driver' | 'shipper' | 'admin'; title?: string; description?: string; action?: EmptyStateProps['action'] }) {
    const { portal = 'default', title, description, action } = props
    return (
      <EmptyState
        portal={portal}
        title={title || "No loads found"}
        description={description || (
          portal === 'driver'
            ? "There are no loads available at the moment. Check back later!"
            : portal === 'shipper'
            ? "You haven't created any loads yet. Create your first load to get started."
            : "No loads found matching your criteria."
        )}
        action={action}
        icon={
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
    )
  },

  NoInvoices: function NoInvoices(props: { portal?: 'shipper' | 'admin'; title?: string; description?: string; action?: EmptyStateProps['action'] }) {
    const { portal = 'default', title, description, action } = props
    return (
      <EmptyState
        portal={portal}
        title={title || "No invoices"}
        description={description || "Invoices will appear here once loads are completed and invoiced."}
        action={action}
        icon={
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
    )
  },

  NoDocuments: function NoDocuments(props: { portal?: 'driver' | 'shipper'; title?: string; description?: string; action?: EmptyStateProps['action'] }) {
    const { portal = 'default', title, description, action } = props
    return (
      <EmptyState
        portal={portal}
        title={title || "No documents"}
        description={description || "Documents will appear here once they are uploaded for your loads."}
        action={action}
        icon={
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        }
      />
    )
  },

  NoNotifications: function NoNotifications(props: { portal?: 'driver' | 'shipper'; title?: string; description?: string }) {
    const { portal = 'default', title, description } = props
    return (
      <EmptyState
        portal={portal}
        title={title || "No notifications"}
        description={description || "You're all caught up! New notifications will appear here."}
        icon={
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        }
      />
    )
  },
}

