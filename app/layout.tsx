import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gradient-medical-bg antialiased">
        <ToastProvider />
        {children}
      </body>
    </html>
  )
}
