import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          primary: '#2563eb',    // Medical blue
          secondary: '#0d9488',  // Teal
          accent: '#14b8a6',     // Bright teal
        },
        // Medical Blue - Trustworthy, Professional
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',  // Core brand blue
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Medical Teal - Healthcare, Clean, Modern
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',  // Core accent teal
          600: '#0d9488',  // Secondary actions
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // Success Green - Medical-appropriate
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Delivered status
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Urgency Red - For STAT/Critical deliveries
        urgent: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',  // Critical STAT
          600: '#dc2626',  // Alerts/Denied
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Warning Orange - Time-sensitive
        warning: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',  // STAT deliveries
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'var(--font-heading-alt)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(37, 99, 235, 0.1)',     // Blue tint
        'glass-lg': '0 12px 48px 0 rgba(37, 99, 235, 0.15)',
        'medical': '0 4px 20px rgba(20, 184, 166, 0.1)',     // Teal glow
        'urgent': '0 4px 20px rgba(239, 68, 68, 0.2)',       // Red glow for STAT
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        'gradient-accent': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        'gradient-success': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'gradient-urgent': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'gradient-medical-bg': 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #f0fdfa 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
export default config
