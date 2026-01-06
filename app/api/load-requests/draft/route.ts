import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const createDraftSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required'),
  data: z.record(z.any()), // JSON object
})

const updateDraftSchema = z.object({
  data: z.record(z.any()), // JSON object
})

/**
 * GET /api/load-requests/draft
 * Get all drafts for a driver
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { searchParams } = new URL(nextReq.url)
    const driverId = searchParams.get('driverId')

    if (!driverId) {
      return NextResponse.json(
        { error: 'driverId is required' },
        { status: 400 }
      )
    }

    const drafts = await prisma.loadDraft.findMany({
      where: { driverId },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Parse JSON data for each draft
    const parsedDrafts = drafts.map((draft) => ({
      id: draft.id,
      driverId: draft.driverId,
      data: JSON.parse(draft.data || '{}'),
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    }))

    return NextResponse.json({ drafts: parsedDrafts })
  })(request)
}

/**
 * POST /api/load-requests/draft
 * Create a new draft
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const rawData = await nextReq.json()
    const validation = createDraftSchema.safeParse(rawData)

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

    const { driverId, data } = validation.data

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    })

    if (!driver) {
      throw new ValidationError('Driver not found')
    }

    // Create draft
    const draft = await prisma.loadDraft.create({
      data: {
        driverId,
        data: JSON.stringify(data),
      },
    })

    return NextResponse.json(
      {
        draft: {
          id: draft.id,
          driverId: draft.driverId,
          data: JSON.parse(draft.data || '{}'),
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        },
      },
      { status: 201 }
    )
  })(request)
}

