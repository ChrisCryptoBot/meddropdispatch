import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const createBlockedEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  reason: z.string().optional(),
})

/**
 * GET /api/blocked-emails
 * Get all blocked emails (DNU list)
 */
export async function GET(request: NextRequest) {
  try {
    rateLimit(RATE_LIMITS.api)(request)
  } catch (error) {
    return createErrorResponse(error)
  }

  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const blockedEmails = await prisma.blockedEmail.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { blockedAt: 'desc' },
    })

    return NextResponse.json({ blockedEmails })
  } catch (error) {
    return createErrorResponse(error)
  }
}

/**
 * POST /api/blocked-emails
 * Add an email to the DNU list
 */
export async function POST(request: NextRequest) {
  try {
    rateLimit(RATE_LIMITS.api)(request)
  } catch (error) {
    return createErrorResponse(error)
  }

  try {
    const rawData = await request.json()
    const validation = createBlockedEmailSchema.safeParse(rawData)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid email address',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { email, reason } = validation.data
    const emailLower = email.toLowerCase()

    // Check if already blocked
    const existing = await prisma.blockedEmail.findUnique({
      where: { email: emailLower },
    })

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          {
            error: 'EmailAlreadyBlocked',
            message: 'This email is already blocked',
          },
          { status: 409 }
        )
      } else {
        // Reactivate existing block
        const updated = await prisma.blockedEmail.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            reason: reason || existing.reason,
            blockedAt: new Date(),
          },
        })
        return NextResponse.json({ blockedEmail: updated }, { status: 200 })
      }
    }

    // Create new block
    const blockedEmail = await prisma.blockedEmail.create({
      data: {
        email: emailLower,
        reason: reason || null,
        isActive: true,
      },
    })

    return NextResponse.json({ blockedEmail }, { status: 201 })
  } catch (error) {
    return createErrorResponse(error)
  }
}


