/**
 * FormErrors Component
 * Displays field-specific validation errors from API responses
 * 
 * Usage:
 * <FormErrors errors={errors} />
 * 
 * Where errors can be:
 * - { error: string, message: string } (general error)
 * - { error: string, message: string, errors: [{ field: string, message: string }] } (field errors)
 */

import React from 'react'

interface FieldError {
    field: string
    message: string
}

interface ErrorResponse {
    error?: string
    message?: string
    errors?: FieldError[]
}

interface FormErrorsProps {
    errors: ErrorResponse | null
    className?: string
}

export function FormErrors({ errors, className = '' }: FormErrorsProps) {
    if (!errors) return null

    // If there are field-specific errors, display them
    if (errors.errors && errors.errors.length > 0) {
        return (
            <div className={`bg-red-50 border-2 border-red-200 rounded-lg p-4 ${className}`}>
                <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-red-800 mb-2">
                            {errors.error || 'Validation Error'}
                        </h3>
                        <ul className="space-y-1">
                            {errors.errors.map((err, index) => (
                                <li key={index} className="text-sm text-red-700">
                                    <span className="font-medium">{formatFieldName(err.field)}:</span> {err.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )
    }

    // Otherwise, display general error message
    if (errors.message || errors.error) {
        return (
            <div className={`bg-red-50 border-2 border-red-200 rounded-lg p-4 ${className}`}>
                <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">
                            {errors.message || errors.error}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return null
}

/**
 * Format field name for display
 * Converts camelCase/snake_case to Title Case
 */
function formatFieldName(field: string): string {
    return field
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .trim()
}

/**
 * FieldError Component
 * Displays error message for a specific form field
 * 
 * Usage:
 * <FieldError errors={errors} field="email" />
 */
interface FieldErrorProps {
    errors: ErrorResponse | null
    field: string
    className?: string
}

export function FieldError({ errors, field, className = '' }: FieldErrorProps) {
    if (!errors?.errors) return null

    const fieldError = errors.errors.find((err) => err.field === field)
    if (!fieldError) return null

    return (
        <p className={`text-sm text-red-600 mt-1 ${className}`}>
            {fieldError.message}
        </p>
    )
}

/**
 * useFormSubmit Hook
 * Handles form submission with loading state and error handling
 * 
 * Usage:
 * const { isSubmitting, errors, handleSubmit } = useFormSubmit()
 * 
 * <form onSubmit={handleSubmit(async (data) => {
 *   const response = await fetch('/api/endpoint', {
 *     method: 'POST',
 *     body: JSON.stringify(data)
 *   })
 *   if (!response.ok) throw await response.json()
 *   // Success handling
 * })}>
 */
export function useFormSubmit() {
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [errors, setErrors] = React.useState<ErrorResponse | null>(null)

    const handleSubmit = (onSubmit: (data: any) => Promise<void>) => {
        return async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault()

            // Prevent double submission
            if (isSubmitting) return

            setIsSubmitting(true)
            setErrors(null)

            try {
                const formData = new FormData(e.currentTarget)
                const data = Object.fromEntries(formData.entries())
                await onSubmit(data)
            } catch (error: any) {
                setErrors(error)
            } finally {
                setIsSubmitting(false)
            }
        }
    }

    return { isSubmitting, errors, setErrors, handleSubmit }
}
