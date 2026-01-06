// Load Notes API Route
// GET: Get all notes for a load
// POST: Create a new note

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const createNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  isInternal: z.boolean().default(false),
  createdBy: z.string().min(1, 'createdBy is required'),
  createdByType: z.enum(['DRIVER', 'SHIPPER', 'ADMIN'], {
    errorMap: () => ({ message: 'createdByType must be DRIVER, SHIPPER, or ADMIN' }),
  }),
})

/**
 * GET /api/load-requests/[id]/notes
 * Get all notes for a load request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    const notes = await prisma.loadNote.findMany({
      where: { loadRequestId: id },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ notes })
  })(request)
}

/**
 * POST /api/load-requests/[id]/notes
 * Create a new note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await nextReq.json()
    const validation = createNoteSchema.safeParse(rawData)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid note data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify load request exists
    const loadRequest = await prisma.loadRequest.findUnique({
      where: { id },
    })

    if (!loadRequest) {
      throw new NotFoundError('Load request')
    }

    const note = await prisma.loadNote.create({
      data: {
        loadRequestId: id,
        content: data.content,
        isInternal: data.isInternal,
        createdBy: data.createdBy,
        createdByType: data.createdByType,
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  })(request)
}


