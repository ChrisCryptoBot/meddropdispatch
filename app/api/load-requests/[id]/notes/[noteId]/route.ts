// Single Load Note API Route
// PATCH: Update a note
// DELETE: Delete a note

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const updateNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').optional(),
  isInternal: z.boolean().optional(),
})

/**
 * PATCH /api/load-requests/[id]/notes/[noteId]
 * Update a note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: loadRequestId, noteId } = await params
    const rawData = await nextReq.json()
    const validation = updateNoteSchema.safeParse(rawData)

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

    // Verify note exists and belongs to this load
    const existingNote = await prisma.loadNote.findFirst({
      where: {
        id: noteId,
        loadRequestId: loadRequestId,
      },
    })

    if (!existingNote) {
      throw new NotFoundError('Note')
    }

    // Build update data
    const updateData: any = {}
    if (data.content !== undefined) updateData.content = data.content
    if (data.isInternal !== undefined) updateData.isInternal = data.isInternal

    const note = await prisma.loadNote.update({
      where: { id: noteId },
      data: updateData,
    })

    return NextResponse.json({ note })
  })(request)
}

/**
 * DELETE /api/load-requests/[id]/notes/[noteId]
 * Delete a note
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  return withErrorHandling(async (req: Request) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id: loadRequestId, noteId } = await params

    // Verify note exists and belongs to this load
    const note = await prisma.loadNote.findFirst({
      where: {
        id: noteId,
        loadRequestId: loadRequestId,
      },
    })

    if (!note) {
      throw new NotFoundError('Note')
    }

    await prisma.loadNote.delete({
      where: { id: noteId },
    })

    return NextResponse.json({ success: true })
  })(request)
}


