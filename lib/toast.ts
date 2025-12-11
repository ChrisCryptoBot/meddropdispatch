// Toast Notification Utilities
// Centralized toast notification functions

import { toast } from 'sonner'

export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
    })
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
    })
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
    })
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
    })
  },

  loading: (message: string) => {
    return toast.loading(message)
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return toast.promise(promise, messages)
  },
}

// Helper to show error from API response
export function showApiError(error: unknown, defaultMessage: string = 'An error occurred') {
  if (error instanceof Error) {
    showToast.error(error.message || defaultMessage)
  } else if (typeof error === 'string') {
    showToast.error(error)
  } else {
    showToast.error(defaultMessage)
  }
}

// Helper to show success message
export function showSuccess(message: string) {
  showToast.success(message)
}

