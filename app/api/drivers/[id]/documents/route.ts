import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, NotFoundError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/drivers/[id]/documents
 * Get all documents for a driver's loads (aggregate view)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    const { id } = await params

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!driver) {
      throw new NotFoundError('Driver')
    }

    // Get query parameters (use request parameter which is always NextRequest)
    const searchParams = request.nextUrl.searchParams
    const loadRequestId = searchParams.get('loadRequestId')
    const documentType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause - get documents from all loads assigned to this driver
    const where: any = {
      loadRequest: {
        driverId: id,
      },
    }

    if (loadRequestId) {
      where.loadRequestId = loadRequestId
    }

    if (documentType) {
      where.type = documentType
    }

    // Fetch documents
    const [documents, totalCount] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          loadRequest: {
            select: {
              id: true,
              publicTrackingCode: true,
              status: true,
              pickupFacility: {
                select: {
                  name: true,
                  city: true,
                  state: true,
                },
              },
              dropoffFacility: {
                select: {
                  name: true,
                  city: true,
                  state: true,
                },
              },
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ])

    // Group documents by load for easier display
    const documentsByLoad = documents.reduce((acc, doc) => {
      const loadId = doc.loadRequestId
      if (!acc[loadId]) {
        acc[loadId] = {
          loadRequest: doc.loadRequest,
          documents: [],
        }
      }
      acc[loadId].documents.push(doc)
      return acc
    }, {} as Record<string, { loadRequest: any; documents: any[] }>)

    return NextResponse.json({
      documents,
      documentsByLoad: Object.values(documentsByLoad),
      totalCount,
      loadCount: Object.keys(documentsByLoad).length,
    })
  })(request)
}
