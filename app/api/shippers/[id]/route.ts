import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/shippers/[id]
 * Get shipper details including billing information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const shipper = await prisma.shipper.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        clientType: true,
        contactName: true,
        phone: true,
        email: true,
        isActive: true,
        paymentTerms: true,
        billingContactName: true,
        billingContactEmail: true,
        billingAddressLine1: true,
        billingAddressLine2: true,
        billingCity: true,
        billingState: true,
        billingPostalCode: true,
        stripeCustomerId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!shipper) {
      return NextResponse.json(
        { error: 'Shipper not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ shipper })
  } catch (error) {
    console.error('Error fetching shipper:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shipper', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/shippers/[id]
 * Update shipper details including billing information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Only allow updating specific fields
    const {
      companyName,
      contactName,
      email,
      phone,
      paymentTerms,
      billingContactName,
      billingContactEmail,
      billingAddressLine1,
      billingAddressLine2,
      billingCity,
      billingState,
      billingPostalCode,
    } = body

    const updateData: any = {}

    if (companyName !== undefined) updateData.companyName = companyName
    if (contactName !== undefined) updateData.contactName = contactName
    if (email !== undefined) updateData.email = email.toLowerCase()
    if (phone !== undefined) updateData.phone = phone
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (billingContactName !== undefined) updateData.billingContactName = billingContactName || null
    if (billingContactEmail !== undefined) updateData.billingContactEmail = billingContactEmail || null
    if (billingAddressLine1 !== undefined) updateData.billingAddressLine1 = billingAddressLine1 || null
    if (billingAddressLine2 !== undefined) updateData.billingAddressLine2 = billingAddressLine2 || null
    if (billingCity !== undefined) updateData.billingCity = billingCity || null
    if (billingState !== undefined) updateData.billingState = billingState || null
    if (billingPostalCode !== undefined) updateData.billingPostalCode = billingPostalCode || null

    const shipper = await prisma.shipper.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        companyName: true,
        clientType: true,
        contactName: true,
        phone: true,
        email: true,
        isActive: true,
        paymentTerms: true,
        billingContactName: true,
        billingContactEmail: true,
        billingAddressLine1: true,
        billingAddressLine2: true,
        billingCity: true,
        billingState: true,
        billingPostalCode: true,
        stripeCustomerId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ shipper })
  } catch (error) {
    console.error('Error updating shipper:', error)
    return NextResponse.json(
      { error: 'Failed to update shipper', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

