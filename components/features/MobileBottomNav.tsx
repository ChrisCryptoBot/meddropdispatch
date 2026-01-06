'use client'

// Mobile Bottom Navigation Component
// Fixed bottom navigation bar for mobile devices

import { usePathname } from 'next/navigation'
import Link from 'next/link'

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  activeIcon?: React.ReactNode
}

interface MobileBottomNavProps {
  items: NavItem[]
  className?: string
}

export default function MobileBottomNav({ items, className = '' }: MobileBottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden ${className}`}>
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = isActive && item.activeIcon ? item.activeIcon : item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 ${
                isActive
                  ? 'text-slate-600'
                  : 'text-gray-500 hover:text-gray-700'
              } transition-colors`}
            >
              <div className="flex-shrink-0 mb-1">
                {Icon}
              </div>
              <span className="text-xs font-medium truncate w-full text-center">
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}


