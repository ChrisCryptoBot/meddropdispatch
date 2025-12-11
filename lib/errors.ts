// Standardized Error Handling
// Centralized error types and handling for consistent API responses

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: any[]) {
    super(400, message, 'VALIDATION_ERROR', { errors })
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(401, message, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(403, message, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT')
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(429, message, 'RATE_LIMIT_EXCEEDED')
    this.name = 'RateLimitError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', public originalError?: any) {
    super(500, message, 'DATABASE_ERROR', { originalError: originalError?.message })
    this.name = 'DatabaseError'
  }
}

// Error response formatter
export interface ErrorResponse {
  error: string
  message: string
  code?: string
  details?: any
  timestamp: string
}

export function createErrorResponse(error: unknown): NextResponse<ErrorResponse> {
  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'ValidationError',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          errors: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    )
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any
    
    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'ConflictError',
          message: 'A record with this value already exists',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          details: { field: prismaError.meta?.target },
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      )
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        {
          error: 'NotFoundError',
          message: 'Record not found',
          code: 'RECORD_NOT_FOUND',
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // Foreign key constraint violation
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid reference to related record',
          code: 'FOREIGN_KEY_CONSTRAINT',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
  }

  // Handle generic errors
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
  const errorStack = error instanceof Error ? error.stack : undefined

  // Log full error for debugging (in production, use proper logging service)
  console.error('Unhandled error:', {
    message: errorMessage,
    stack: errorStack,
    error,
  })

  // Don't expose stack traces in production
  const isDevelopment = process.env.NODE_ENV === 'development'

  return NextResponse.json(
    {
      error: 'InternalServerError',
      message: isDevelopment ? errorMessage : 'An internal server error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      details: isDevelopment ? { stack: errorStack } : undefined,
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  )
}

// Error handler wrapper for API routes
export function withErrorHandling(
  handler: (request: Request, context?: any) => Promise<NextResponse>
) {
  return async (request: Request, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return createErrorResponse(error)
    }
  }
}

// Async error handler for Next.js API routes
export function asyncHandler<T extends any[]>(
  fn: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await fn(...args)
    } catch (error) {
      return createErrorResponse(error)
    }
  }
}

