import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/drivers/[id]/documents
 * Get all documents for loads assigned to a driver
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: driverId } = await params
    const { searchParams } = new URL(request.url)
    const loadId = searchParams.get('loadId')
    const type = searchParams.get('type')

    // First, get all loads assigned to this driver
    const loads = await prisma.loadRequest.findMany({
      where: {
        driverId: driverId,
      },
      select: {
        id: true,
        publicTrackingCode: true,
      },
    })

    const loadIds = loads.map(load => load.id)

    if (loadIds.length === 0) {
      return NextResponse.json({ documents: [] })
    }

    // Build where clause
    const where: any = {
      loadRequestId: {
        in: loadIds,
      },
    }

    if (loadId) {
      where.loadRequestId = loadId
    }

    if (type) {
      where.type = type
    }

    // Fetch documents with load info
    const documents = await prisma.document.findMany({
      where,
      include: {
        loadRequest: {
          select: {
            id: true,
            publicTrackingCode: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Add load tracking code to each document
    const documentsWithLoadInfo = documents.map(doc => ({
      ...doc,
      loadTrackingCode: doc.loadRequest.publicTrackingCode,
    }))

    return NextResponse.json({ documents: documentsWithLoadInfo })
  } catch (error) {
    console.error('Error fetching driver documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

