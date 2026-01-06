/**
 * Design Tokens
 * Centralized design system tokens for consistent styling across all portals
 */

// Color Tokens
export const colors = {
  // Portal Themes
  driver: {
    primary: 'teal',
    glass: 'glass-accent',
    gradient: 'bg-gradient-accent',
    border: 'border-teal-200/30',
    shadow: 'shadow-medical',
    focus: 'focus:ring-teal-500',
  },
  shipper: {
    primary: 'blue',
    glass: 'glass-primary',
    gradient: 'bg-gradient-primary',
    border: 'border-blue-200/30',
    shadow: 'shadow-glass',
    focus: 'focus:ring-blue-500',
  },
  admin: {
    primary: 'blue',
    glass: 'glass-primary',
    gradient: 'bg-gradient-primary',
    border: 'border-blue-200/30',
    shadow: 'shadow-glass',
    focus: 'focus:ring-blue-500',
  },
} as const

// Spacing Scale
export const spacing = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const

// Tailwind Spacing Classes
export const spacingClasses = {
  card: 'p-6',
  section: 'p-8',
  container: 'p-4',
  button: {
    small: 'px-4 py-2',
    medium: 'px-6 py-3',
    large: 'px-8 py-4',
  },
  gap: {
    small: 'gap-2',
    medium: 'gap-4',
    large: 'gap-6',
  },
  margin: {
    section: 'mb-6',
    subsection: 'mb-4',
    element: 'mb-2',
  },
} as const

// Typography Scale
export const typography = {
  heading: {
    h1: 'text-4xl font-bold',
    h2: 'text-2xl font-bold',
    h3: 'text-xl font-semibold',
    h4: 'text-lg font-semibold',
  },
  body: {
    large: 'text-lg',
    base: 'text-base',
    small: 'text-sm',
    xs: 'text-xs',
  },
  weight: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },
  color: {
    heading: 'text-gray-900',
    body: 'text-gray-700',
    muted: 'text-gray-500',
    light: 'text-gray-400',
  },
} as const

// Border Radius
export const borderRadius = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
} as const

// Shadows
export const shadows = {
  glass: 'shadow-glass',
  medical: 'shadow-medical',
  urgent: 'shadow-urgent',
  large: 'shadow-lg',
  glassLarge: 'shadow-glass-lg',
} as const

// Transitions
export const transitions = {
  base: 'transition-all duration-200 ease-in-out',
  fast: 'transition-all duration-150 ease-in-out',
  slow: 'transition-all duration-300 ease-in-out',
} as const

// Button Variants
export const buttonVariants = {
  primary: {
    driver: 'bg-gradient-accent text-white hover:shadow-lg shadow-medical',
    shipper: 'bg-gradient-primary text-white hover:shadow-lg shadow-lg',
    admin: 'bg-gradient-primary text-white hover:shadow-lg shadow-lg',
  },
  secondary: {
    driver: 'bg-white/60 hover:bg-white/80 border border-gray-300 text-gray-700',
    shipper: 'bg-white/60 hover:bg-white/80 border border-gray-300 text-gray-700',
    admin: 'bg-white/60 hover:bg-white/80 border border-gray-300 text-gray-700',
  },
  danger: {
    driver: 'bg-red-600 hover:bg-red-700 text-white',
    shipper: 'bg-red-600 hover:bg-red-700 text-white',
    admin: 'bg-red-600 hover:bg-red-700 text-white',
  },
  ghost: {
    driver: 'bg-transparent hover:bg-teal-50 text-teal-700',
    shipper: 'bg-transparent hover:bg-blue-50 text-blue-700',
    admin: 'bg-transparent hover:bg-blue-50 text-blue-700',
  },
} as const

// Card Variants
export const cardVariants = {
  driver: {
    default: 'glass-accent rounded-2xl p-6 border-2 border-teal-200/30 shadow-medical',
    elevated: 'glass-accent rounded-2xl p-6 border-2 border-teal-200/30 shadow-medical hover:shadow-glass-lg',
    outlined: 'glass-accent rounded-2xl p-6 border-2 border-teal-300/50 shadow-medical',
  },
  shipper: {
    default: 'glass-primary rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass',
    elevated: 'glass-primary rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass hover:shadow-glass-lg',
    outlined: 'glass-primary rounded-2xl p-6 border-2 border-blue-300/50 shadow-glass',
  },
  admin: {
    default: 'glass-primary rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass',
    elevated: 'glass-primary rounded-2xl p-6 border-2 border-blue-200/30 shadow-glass hover:shadow-glass-lg',
    outlined: 'glass-primary rounded-2xl p-6 border-2 border-blue-300/50 shadow-glass',
  },
} as const

// Input Variants
export const inputVariants = {
  driver: {
    default: 'w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white/60 backdrop-blur-sm',
    filled: 'w-full px-4 py-3 rounded-lg border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-teal-50/60',
  },
  shipper: {
    default: 'w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/60 backdrop-blur-sm',
    filled: 'w-full px-4 py-3 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80',
  },
  admin: {
    default: 'w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/60 backdrop-blur-sm',
    filled: 'w-full px-4 py-3 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80',
  },
} as const

// Helper function to get portal theme
export function getPortalTheme(portal: 'driver' | 'shipper' | 'admin') {
  return colors[portal]
}

// Helper function to get button classes
export function getButtonClasses(
  variant: 'primary' | 'secondary' | 'danger' | 'ghost',
  portal: 'driver' | 'shipper' | 'admin',
  size: 'small' | 'medium' | 'large' = 'medium'
) {
  const base = `${spacingClasses.button[size]} ${borderRadius.sm} font-semibold ${transitions.base} disabled:opacity-50 disabled:cursor-not-allowed`
  const variantClass = buttonVariants[variant][portal]
  return `${base} ${variantClass}`
}

// Helper function to get card classes
export function getCardClasses(
  variant: 'default' | 'elevated' | 'outlined',
  portal: 'driver' | 'shipper' | 'admin'
) {
  return cardVariants[portal][variant]
}

// Helper function to get input classes
export function getInputClasses(
  variant: 'default' | 'filled',
  portal: 'driver' | 'shipper' | 'admin'
) {
  return inputVariants[portal][variant]
}

