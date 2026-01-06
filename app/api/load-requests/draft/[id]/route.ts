import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const updateDraftSchema = z.object({
  data: z.record(z.any()), // JSON object
})

/**
 * GET /api/load-requests/draft/[id]
 * Get a specific draft
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

    const draft = await prisma.loadDraft.findUnique({
      where: { id },
    })

    if (!draft) {
      throw new NotFoundError('Draft')
    }

    return NextResponse.json({
      draft: {
        id: draft.id,
        driverId: draft.driverId,
        data: JSON.parse(draft.data || '{}'),
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      },
    })
  })(request)
}

/**
 * PATCH /api/load-requests/draft/[id]
 * Update a draft
 */
export async function PATCH(
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
    const validation = updateDraftSchema.safeParse(rawData)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid draft data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { data } = validation.data

    // Check if draft exists
    const existingDraft = await prisma.loadDraft.findUnique({
      where: { id },
    })

    if (!existingDraft) {
      throw new NotFoundError('Draft')
    }

    // Update draft
    const draft = await prisma.loadDraft.update({
      where: { id },
      data: {
        data: JSON.stringify(data),
      },
    })

    return NextResponse.json({
      draft: {
        id: draft.id,
        driverId: draft.driverId,
        data: JSON.parse(draft.data || '{}'),
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      },
    })
  })(request)
}

/**
 * DELETE /api/load-requests/draft/[id]
 * Delete a draft
 */
export async function DELETE(
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

    const draft = await prisma.loadDraft.findUnique({
      where: { id },
    })

    if (!draft) {
      throw new NotFoundError('Draft')
    }

    await prisma.loadDraft.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
    })
  })(request)
}

