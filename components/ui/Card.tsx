'use client'

import { HTMLAttributes, ReactNode } from 'react'
import { getCardClasses } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined'
  portal?: 'driver' | 'shipper' | 'admin'
  children: ReactNode
}

export default function Card({
  variant = 'default',
  portal = 'driver',
  className,
  children,
  ...props
}: CardProps) {
  const baseClasses = getCardClasses(variant, portal)
  
  return (
    <div className={cn(baseClasses, className)} {...props}>
      {children}
    </div>
  )
}

