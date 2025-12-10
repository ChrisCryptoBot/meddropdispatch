import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/drivers
 * Get all active drivers
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const drivers = await prisma.driver.findMany({
      where: {
        isActive: true,
        ...(status && { status: status as any }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehiclePlate: true,
        hasRefrigeration: true,
        un3373Certified: true,
        _count: {
          select: {
            assignedLoads: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // Available first
        { firstName: 'asc' },
      ],
    })

    return NextResponse.json({ drivers })

  } catch (error) {
    console.error('Error fetching drivers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drivers', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
