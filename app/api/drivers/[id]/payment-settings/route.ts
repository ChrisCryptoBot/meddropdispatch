import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/drivers/[id]/payment-settings
 * Get driver payment settings
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
        paymentMethod: true,
        bankName: true,
        accountHolderName: true,
        routingNumber: true,
        accountNumber: true,
        accountType: true,
        payoutFrequency: true,
        minimumPayout: true,
        taxId: true,
        taxIdType: true,
        w9Submitted: true,
      },
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ paymentSettings: driver })
  } catch (error) {
    console.error('Error fetching payment settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment settings', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/drivers/[id]/payment-settings
 * Update driver payment settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      paymentMethod,
      bankName,
      accountHolderName,
      routingNumber,
      accountNumber,
      accountType,
      payoutFrequency,
      minimumPayout,
      taxId,
      taxIdType,
      w9Submitted,
    } = body

    const updateData: any = {}

    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod || null
    if (bankName !== undefined) updateData.bankName = bankName || null
    if (accountHolderName !== undefined) updateData.accountHolderName = accountHolderName || null
    if (routingNumber !== undefined) updateData.routingNumber = routingNumber || null
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber || null
    if (accountType !== undefined) updateData.accountType = accountType || null
    if (payoutFrequency !== undefined) updateData.payoutFrequency = payoutFrequency || null
    if (minimumPayout !== undefined) updateData.minimumPayout = minimumPayout || null
    if (taxId !== undefined) updateData.taxId = taxId || null
    if (taxIdType !== undefined) updateData.taxIdType = taxIdType || null
    if (w9Submitted !== undefined) updateData.w9Submitted = w9Submitted

    const driver = await prisma.driver.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        paymentMethod: true,
        bankName: true,
        accountHolderName: true,
        routingNumber: true,
        accountNumber: true,
        accountType: true,
        payoutFrequency: true,
        minimumPayout: true,
        taxId: true,
        taxIdType: true,
        w9Submitted: true,
      },
    })

    return NextResponse.json({ paymentSettings: driver })
  } catch (error) {
    console.error('Error updating payment settings:', error)
    return NextResponse.json(
      { error: 'Failed to update payment settings', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

