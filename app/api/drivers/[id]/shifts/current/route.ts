// Driver Shift Current Status API Endpoint (Fleet Enterprise - Tier 1)
// GET /api/drivers/[id]/shifts/current - Get current shift status

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling, AuthorizationError, NotFoundError } from '@/lib/errors'
import { requireDriver } from '@/lib/authorization'

/**
 * GET /api/drivers/[id]/shifts/current
 * Get the current active shift for a driver
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const { id: driverId } = await params

    // AUTHORIZATION: Verify authenticated driver matches driverId
    const auth = await requireDriver(request)
    if (auth.userId !== driverId) {
      throw new AuthorizationError('Cannot view shifts for another driver')
    }

    // Find the current open shift
    const currentShift = await prisma.driverShift.findFirst({
      where: { driverId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    })

    if (!currentShift) {
      return NextResponse.json({ shift: null })
    }

    // Calculate current hours if shift is still active
    const now = new Date()
    const currentHours = (now.getTime() - currentShift.clockIn.getTime()) / (1000 * 60 * 60)

    return NextResponse.json({
      shift: {
        id: currentShift.id,
        driverId: currentShift.driverId,
        clockIn: currentShift.clockIn.toISOString(),
        clockOut: currentShift.clockOut?.toISOString() || null,
        totalHours: currentShift.totalHours,
        currentHours: parseFloat(currentHours.toFixed(2)),
      },
    })
  })(request)
}

