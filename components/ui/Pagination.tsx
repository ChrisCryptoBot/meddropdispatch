'use client'

import { cn } from '@/lib/utils'

interface PaginationProps {
  /**
   * Current page (1-indexed)
   */
  currentPage: number
  
  /**
   * Total number of pages
   */
  totalPages: number
  
  /**
   * Total number of items
   */
  totalItems: number
  
  /**
   * Items per page
   */
  itemsPerPage: number
  
  /**
   * Callback when page changes
   */
  onPageChange: (page: number) => void
  
  /**
   * Optional callback when items per page changes
   */
  onItemsPerPageChange?: (itemsPerPage: number) => void
  
  /**
   * Portal context for styling
   * @default 'default'
   */
  portal?: 'driver' | 'shipper' | 'admin' | 'default'
  
  /**
   * Show items per page selector
   * @default false
   */
  showItemsPerPage?: boolean
  
  /**
   * Available items per page options
   * @default [10, 25, 50, 100]
   */
  itemsPerPageOptions?: number[]
  
  /**
   * Additional className
   */
  className?: string
}

/**
 * Reusable Pagination Component
 * 
 * Provides consistent pagination UI across list views with page navigation,
 * items per page selection, and total count display.
 * 
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={1}
 *   totalPages={10}
 *   totalItems={250}
 *   itemsPerPage={25}
 *   onPageChange={(page) => setPage(page)}
 *   portal="driver"
 * />
 * ```
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  portal = 'default',
  showItemsPerPage = false,
  itemsPerPageOptions = [10, 25, 50, 100],
  className,
}: PaginationProps) {
  const portalStyles = {
    driver: {
      button: 'border-teal-200 text-accent-700 hover:bg-teal-50',
      active: 'bg-gradient-accent text-white border-transparent',
      disabled: 'opacity-50 cursor-not-allowed',
    },
    shipper: {
      button: 'border-blue-200 text-primary-700 hover:bg-blue-50',
      active: 'bg-gradient-primary text-white border-transparent',
      disabled: 'opacity-50 cursor-not-allowed',
    },
    admin: {
      button: 'border-blue-200 text-blue-700 hover:bg-blue-50',
      active: 'bg-blue-600 text-white border-transparent',
      disabled: 'opacity-50 cursor-not-allowed',
    },
    default: {
      button: 'border-gray-200 text-gray-700 hover:bg-gray-50',
      active: 'bg-gray-600 text-white border-transparent',
      disabled: 'opacity-50 cursor-not-allowed',
    },
  }

  const styles = portalStyles[portal]

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  if (totalPages <= 1 && !showItemsPerPage) {
    return null
  }

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4', className)}>
      {/* Items per page selector */}
      {showItemsPerPage && onItemsPerPageChange && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Items per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className={cn(
              'px-3 py-1.5 rounded-lg border text-sm',
              portal === 'driver' && 'border-teal-200 bg-teal-50',
              portal === 'shipper' && 'border-blue-200 bg-blue-50',
              portal === 'admin' && 'border-blue-200 bg-blue-50',
              portal === 'default' && 'border-gray-200 bg-gray-50'
            )}
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Page info */}
      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold">{startItem}</span> to{' '}
        <span className="font-semibold">{endItem}</span> of{' '}
        <span className="font-semibold">{totalItems}</span> results
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={cn(
              'px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
              styles.button,
              currentPage === 1 && styles.disabled
            )}
            aria-label="Previous page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Page numbers */}
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-3 py-2 text-gray-400">
                  ...
                </span>
              )
            }

            const pageNum = page as number
            const isActive = pageNum === currentPage

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'px-4 py-2 rounded-lg border text-sm font-medium transition-colors min-w-[2.5rem]',
                  isActive ? styles.active : styles.button
                )}
                aria-label={`Page ${pageNum}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            )
          })}

          {/* Next button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={cn(
              'px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
              styles.button,
              currentPage === totalPages && styles.disabled
            )}
            aria-label="Next page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}










