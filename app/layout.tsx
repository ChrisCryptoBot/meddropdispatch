import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans, Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Tech-Medical Typography Upgrade
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-heading-alt',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

// Monospace for technical data (tracking codes, prices, dates)
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'MED DROP - Superior One Logistics Software',
  description: 'Professional medical courier and logistics services for healthcare facilities',
  manifest: '/manifest.json',
  themeColor: '#0ea5e9',
  icons: {
    icon: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MED DROP',
  },
  other: {
    'mobile-web-app-capable': 'yes', // Modern standard (replaces deprecated apple-mobile-web-app-capable)
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable} ${outfit.variable} ${jetBrainsMono.variable}`}>
      <body className="min-h-screen bg-slate-950 text-slate-300 antialiased">
        <ToastProvider />
        {children}
      </body>
    </html>
  )
}
