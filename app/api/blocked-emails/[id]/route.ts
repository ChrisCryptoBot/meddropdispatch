import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * PATCH /api/blocked-emails/[id]
 * Update blocked email (unblock/reactivate)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params
    const rawData = await nextReq.json()
    const { isActive } = rawData

    const blockedEmail = await prisma.blockedEmail.findUnique({
      where: { id },
    })

    if (!blockedEmail) {
      throw new NotFoundError('Blocked email')
    }

    const updated = await prisma.blockedEmail.update({
      where: { id },
      data: {
        isActive: isActive !== undefined ? isActive : !blockedEmail.isActive,
      },
    })

    return NextResponse.json({ blockedEmail: updated })
  })(request)
}

/**
 * DELETE /api/blocked-emails/[id]
 * Permanently remove from DNU list
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const nextReq = req as NextRequest
    try {
      rateLimit(RATE_LIMITS.api)(nextReq)
    } catch (error) {
      return createErrorResponse(error)
    }

    const { id } = await params

    const blockedEmail = await prisma.blockedEmail.findUnique({
      where: { id },
    })

    if (!blockedEmail) {
      throw new NotFoundError('Blocked email')
    }

    await prisma.blockedEmail.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Email removed from DNU list',
    })
  })(request)
}


