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
    <nav className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-auto px-4 py-2 rounded-full bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl z-50 md:hidden ${className}`}>
      <div className="flex items-center justify-center gap-2 h-12">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = isActive && item.activeIcon ? item.activeIcon : item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center h-10 w-10 rounded-lg transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 scale-110'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex-shrink-0 text-xl">
                {Icon}
              </div>
              {isActive && (
                <span className="text-[10px] font-medium text-cyan-400 mt-0.5 truncate">
                  {item.name}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}


