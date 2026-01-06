import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { z } from 'zod'

const updatePreferencesSchema = z.object({
  emailNotifications: z.record(z.boolean()).optional(),
  inAppNotifications: z.record(z.boolean()).optional(),
  smsNotifications: z.record(z.boolean()).optional(),
})

/**
 * GET /api/shippers/[id]/notification-preferences
 * Get notification preferences for a shipper
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

    // Verify shipper exists
    const shipper = await prisma.shipper.findUnique({
      where: { id },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    // Get or create preferences
    let preferences = await prisma.notificationPreferences.findUnique({
      where: { shipperId: id },
    })

    // If no preferences exist, create default ones
    if (!preferences) {
      const defaultEmail = {
        callbackRequested: true,
        loadUpdated: true,
        statusChanges: true,
        documentUploads: true,
        invoiceReady: true,
      }
      const defaultInApp = {
        enabled: true,
      }
      const defaultSms = {
        enabled: false,
      }

      preferences = await prisma.notificationPreferences.create({
        data: {
          shipperId: id,
          emailNotifications: JSON.stringify(defaultEmail),
          inAppNotifications: JSON.stringify(defaultInApp),
          smsNotifications: JSON.stringify(defaultSms),
        },
      })
    }

    // Parse JSON strings
    const parsedPreferences = {
      id: preferences.id,
      emailNotifications: JSON.parse(preferences.emailNotifications || '{}'),
      inAppNotifications: JSON.parse(preferences.inAppNotifications || '{}'),
      smsNotifications: JSON.parse(preferences.smsNotifications || '{}'),
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    }

    return NextResponse.json({ preferences: parsedPreferences })
  })(request)
}

/**
 * PATCH /api/shippers/[id]/notification-preferences
 * Update notification preferences for a shipper
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
    const validation = updatePreferencesSchema.safeParse(rawData)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Invalid preferences data',
          errors: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify shipper exists
    const shipper = await prisma.shipper.findUnique({
      where: { id },
    })

    if (!shipper) {
      throw new NotFoundError('Shipper')
    }

    // Get existing preferences or create new
    let preferences = await prisma.notificationPreferences.findUnique({
      where: { shipperId: id },
    })

    // Build update data
    const updateData: any = {}
    if (data.emailNotifications !== undefined) {
      updateData.emailNotifications = JSON.stringify(data.emailNotifications)
    }
    if (data.inAppNotifications !== undefined) {
      updateData.inAppNotifications = JSON.stringify(data.inAppNotifications)
    }
    if (data.smsNotifications !== undefined) {
      updateData.smsNotifications = JSON.stringify(data.smsNotifications)
    }

    if (preferences) {
      // Update existing preferences
      preferences = await prisma.notificationPreferences.update({
        where: { shipperId: id },
        data: updateData,
      })
    } else {
      // Create new preferences with defaults for missing fields
      const defaultEmail = data.emailNotifications || {
        callbackRequested: true,
        loadUpdated: true,
        statusChanges: true,
        documentUploads: true,
        invoiceReady: true,
      }
      const defaultInApp = data.inAppNotifications || { enabled: true }
      const defaultSms = data.smsNotifications || { enabled: false }

      preferences = await prisma.notificationPreferences.create({
        data: {
          shipperId: id,
          emailNotifications: JSON.stringify(defaultEmail),
          inAppNotifications: JSON.stringify(defaultInApp),
          smsNotifications: JSON.stringify(defaultSms),
          ...updateData,
        },
      })
    }

    // Parse JSON strings for response
    const parsedPreferences = {
      id: preferences.id,
      emailNotifications: JSON.parse(preferences.emailNotifications || '{}'),
      inAppNotifications: JSON.parse(preferences.inAppNotifications || '{}'),
      smsNotifications: JSON.parse(preferences.smsNotifications || '{}'),
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    }

    return NextResponse.json({ preferences: parsedPreferences })
  })(request)
}

