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

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid shipper ID' },
        { status: 400 }
      )
    }

    // Get all facilities for this shipper
    const facilities = await prisma.facility.findMany({
      where: { shipperId: id },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate usage count for each facility (only loads for this shipper)
    const facilitiesWithUsage = await Promise.all(
      facilities.map(async (facility) => {
        try {
          // Count pickup loads for this facility that belong to this shipper
          const pickupCount = await prisma.loadRequest.count({
            where: {
              pickupFacilityId: facility.id,
              shipperId: id, // Only count loads for this shipper
            },
          })

          // Count dropoff loads for this facility that belong to this shipper
          const dropoffCount = await prisma.loadRequest.count({
            where: {
              dropoffFacilityId: facility.id,
              shipperId: id, // Only count loads for this shipper
            },
          })

          // Serialize DateTime fields to ISO strings
          return {
            id: facility.id,
            name: facility.name,
            facilityType: facility.facilityType,
            addressLine1: facility.addressLine1,
            addressLine2: facility.addressLine2,
            city: facility.city,
            state: facility.state,
            postalCode: facility.postalCode,
            contactName: facility.contactName,
            contactPhone: facility.contactPhone,
            defaultAccessNotes: facility.defaultAccessNotes,
            createdAt: facility.createdAt.toISOString(),
            updatedAt: facility.updatedAt.toISOString(),
            totalUsage: pickupCount + dropoffCount,
          }
        } catch (countError) {
          console.error(`Error counting usage for facility ${facility.id}:`, countError)
          // Return facility with 0 usage if count fails
          return {
            ...facility,
            totalUsage: 0,
          }
        }
      })
    )

    return NextResponse.json({ facilities: facilitiesWithUsage })
  } catch (error) {
    console.error('Error fetching facilities:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { 
        error: 'Failed to fetch facilities',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
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

/**
 * PATCH /api/shippers/[id]/facilities
 * Update a facility (only if it belongs to the shipper)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipperId } = await params
    const body = await request.json()
    const {
      facilityId,
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

    if (!facilityId) {
      return NextResponse.json(
        { error: 'Facility ID is required' },
        { status: 400 }
      )
    }

    // Verify the facility belongs to this shipper
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: {
        id: true,
        shipperId: true,
      },
    })

    if (!facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      )
    }

    if (facility.shipperId !== shipperId) {
      return NextResponse.json(
        { error: 'Unauthorized: Facility does not belong to this shipper' },
        { status: 403 }
      )
    }

    // Validate required fields
    if (!name || !addressLine1 || !city || !state || !postalCode || !contactName || !contactPhone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update the facility
    const updatedFacility = await prisma.facility.update({
      where: { id: facilityId },
      data: {
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

    return NextResponse.json({ facility: updatedFacility }, { status: 200 })
  } catch (error) {
    console.error('Error updating facility:', error)
    return NextResponse.json(
      { error: 'Failed to update facility' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/shippers/[id]/facilities
 * Delete a facility (only if it belongs to the shipper and has no active loads)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipperId } = await params
    const { searchParams } = new URL(request.url)
    const facilityId = searchParams.get('facilityId')

    if (!facilityId) {
      return NextResponse.json(
        { error: 'Facility ID is required' },
        { status: 400 }
      )
    }

    // Verify the facility belongs to this shipper
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
      select: {
        id: true,
        shipperId: true,
        name: true,
      },
    })

    if (!facility) {
      return NextResponse.json(
        { error: 'Facility not found' },
        { status: 404 }
      )
    }

    if (facility.shipperId !== shipperId) {
      return NextResponse.json(
        { error: 'Unauthorized: Facility does not belong to this shipper' },
        { status: 403 }
      )
    }

    // Check if facility is used in any loads (pickup or dropoff)
    const [pickupCount, dropoffCount] = await Promise.all([
      prisma.loadRequest.count({
        where: {
          pickupFacilityId: facilityId,
          shipperId: shipperId,
        },
      }),
      prisma.loadRequest.count({
        where: {
          dropoffFacilityId: facilityId,
          shipperId: shipperId,
        },
      }),
    ])

    const totalUsage = pickupCount + dropoffCount

    // If facility has been used in loads, prevent deletion
    // (This maintains data integrity for historical records)
    if (totalUsage > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete facility',
          message: `This facility has been used in ${totalUsage} load${totalUsage !== 1 ? 's' : ''}. Facilities with load history cannot be deleted to maintain data integrity.`,
          totalUsage,
        },
        { status: 400 }
      )
    }

    // Safe to delete - no loads reference this facility
    await prisma.facility.delete({
      where: { id: facilityId },
    })

    return NextResponse.json(
      { message: 'Facility deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting facility:', error)
    return NextResponse.json(
      { error: 'Failed to delete facility' },
      { status: 500 }
    )
  }
}


