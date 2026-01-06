// Single Facility API Route
// GET: Get facility details
// PATCH: Update facility
// DELETE: Delete facility

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/facilities/[id]
 * Get facility details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const facility = await prisma.facility.findUnique({
      where: { id },
    })

    if (!facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ facility })
  } catch (error) {
    console.error('Error fetching facility:', error)
    return NextResponse.json(
      { error: 'Failed to fetch facility' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/facilities/[id]
 * Update facility
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const facility = await prisma.facility.update({
      where: { id },
      data: body,
    })

    return NextResponse.json({ facility })
  } catch (error) {
    console.error('Error updating facility:', error)
    return NextResponse.json(
      { error: 'Failed to update facility' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/facilities/[id]
 * Delete facility
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.facility.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting facility:', error)
    return NextResponse.json(
      { error: 'Failed to delete facility' },
      { status: 500 }
    )
  }
}


