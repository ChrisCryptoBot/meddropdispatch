import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/drivers/[id]
 * Get driver details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        licenseNumber: true,
        licenseExpiry: true,
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehiclePlate: true,
        hasRefrigeration: true,
        un3373Certified: true,
        un3373ExpiryDate: true,
        hipaaTrainingDate: true,
        hiredDate: true,
        emergencyContact: true,
        emergencyPhone: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ driver })
  } catch (error) {
    console.error('Error fetching driver:', error)
    return NextResponse.json(
      { error: 'Failed to fetch driver', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/drivers/[id]
 * Update driver details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      firstName,
      lastName,
      email,
      phone,
      licenseNumber,
      licenseExpiry,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehiclePlate,
      hasRefrigeration,
      emergencyContact,
      emergencyPhone,
    } = body

    const updateData: any = {}

    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (email !== undefined) updateData.email = email.toLowerCase()
    if (phone !== undefined) updateData.phone = phone
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber || null
    if (licenseExpiry !== undefined) updateData.licenseExpiry = licenseExpiry ? new Date(licenseExpiry) : null
    if (vehicleType !== undefined) updateData.vehicleType = vehicleType || null
    if (vehicleMake !== undefined) updateData.vehicleMake = vehicleMake || null
    if (vehicleModel !== undefined) updateData.vehicleModel = vehicleModel || null
    if (vehicleYear !== undefined) updateData.vehicleYear = vehicleYear || null
    if (vehiclePlate !== undefined) updateData.vehiclePlate = vehiclePlate || null
    if (hasRefrigeration !== undefined) updateData.hasRefrigeration = hasRefrigeration
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact || null
    if (emergencyPhone !== undefined) updateData.emergencyPhone = emergencyPhone || null

    const driver = await prisma.driver.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        licenseNumber: true,
        licenseExpiry: true,
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehiclePlate: true,
        hasRefrigeration: true,
        un3373Certified: true,
        un3373ExpiryDate: true,
        hipaaTrainingDate: true,
        hiredDate: true,
        emergencyContact: true,
        emergencyPhone: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ driver })
  } catch (error) {
    console.error('Error updating driver:', error)
    return NextResponse.json(
      { error: 'Failed to update driver', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

