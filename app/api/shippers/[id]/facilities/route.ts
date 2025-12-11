// Shipper Facilities API Route
// GET: Get all facilities for a shipper
// POST: Create a new facility

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/shippers/[id]/facilities
 * Get all facilities for a shipper
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const facilities = await prisma.facility.findMany({
      where: { shipperId: id },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ facilities })
  } catch (error) {
    console.error('Error fetching facilities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch facilities' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/shippers/[id]/facilities
 * Create a new facility
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      facilityType,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      contactName,
      contactPhone,
      defaultAccessNotes,
    } = body

    if (!name || !addressLine1 || !city || !state || !postalCode || !contactName || !contactPhone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const facility = await prisma.facility.create({
      data: {
        shipperId: id,
        name,
        facilityType: facilityType || 'OTHER',
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state: state.toUpperCase(),
        postalCode,
        contactName,
        contactPhone,
        defaultAccessNotes: defaultAccessNotes || null,
      },
    })

    return NextResponse.json({ facility }, { status: 201 })
  } catch (error) {
    console.error('Error creating facility:', error)
    return NextResponse.json(
      { error: 'Failed to create facility' },
      { status: 500 }
    )
  }
}


