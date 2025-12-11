// Load Template API Route (Single Template)
// GET: Get a single template
// PATCH: Update a template
// DELETE: Delete a template

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/load-templates/[id]
 * Get a single template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const template = await prisma.loadTemplate.findUnique({
      where: { id },
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
          },
        },
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/load-templates/[id]
 * Update a template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const template = await prisma.loadTemplate.update({
      where: { id },
      data: body,
      include: {
        shipper: {
          select: {
            id: true,
            companyName: true,
          },
        },
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/load-templates/[id]
 * Delete a template (soft delete by setting isActive = false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Soft delete by setting isActive = false
    const template = await prisma.loadTemplate.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}

