import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MED DROP - Medical Courier Services',
  description: 'Professional medical courier and logistics services for healthcare facilities',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-neutral-50 to-stone-50 antialiased">
        {children}
      </body>
    </html>
  )
}
