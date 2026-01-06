'use client'

// Toast Notification Provider
// Wraps the app with toast notifications using Sonner

import { Toaster } from 'sonner'

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
      } as any}
    />
  )
}


