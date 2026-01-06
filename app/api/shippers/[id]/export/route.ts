import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyShipperAccess } from '@/lib/authorization'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/shippers/[id]/export
 * Export shipper data (loads, POD documents, chain-of-custody logs)
 * Query params: type=loads|documents|chain-of-custody|all
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    try {
      // Exports can be heavier - throttle a bit stricter via default for now
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'RateLimitError', message: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
    }

    const { id } = await params

    // Ownership guard
    await verifyShipperAccess(request, id)
    const { searchParams } = new URL(request.url)
    const exportType = searchParams.get('type') || 'loads'

    // Verify shipper exists
    const shipper = await prisma.shipper.findUnique({
      where: { id },
      select: { id: true, companyName: true }
    })

    if (!shipper) {
      return NextResponse.json(
        { error: 'Shipper not found' },
        { status: 404 }
      )
    }

    // Get all loads for shipper
    const loads = await prisma.loadRequest.findMany({
      where: { shipperId: id },
      include: {
        pickupFacility: true,
        dropoffFacility: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        trackingEvents: {
          orderBy: { createdAt: 'asc' },
        },
        documents: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' }
    })

    if (exportType === 'loads' || exportType === 'all') {
      // CSV export for loads
      const csvRows = [
        // Header
        ['Tracking Code', 'Status', 'Service Type', 'Pickup Facility', 'Dropoff Facility', 'Driver', 'Ready Time', 'Delivery Deadline', 'Actual Pickup', 'Actual Delivery', 'Late Delivery', 'Quote Amount', 'Created Date'].join(',')
      ]

      for (const load of loads) {
        const row = [
          load.publicTrackingCode,
          load.status,
          load.serviceType,
          `"${load.pickupFacility.name}, ${load.pickupFacility.city}, ${load.pickupFacility.state}"`,
          `"${load.dropoffFacility.name}, ${load.dropoffFacility.city}, ${load.dropoffFacility.state}"`,
          load.driver ? `"${load.driver.firstName} ${load.driver.lastName}"` : '',
          load.readyTime ? new Date(load.readyTime).toISOString() : '',
          load.deliveryDeadline ? new Date(load.deliveryDeadline).toISOString() : '',
          load.actualPickupTime ? new Date(load.actualPickupTime).toISOString() : '',
          load.actualDeliveryTime ? new Date(load.actualDeliveryTime).toISOString() : '',
          load.lateDeliveryFlag ? 'Yes' : 'No',
          load.quoteAmount || '',
          new Date(load.createdAt).toISOString(),
        ]
        csvRows.push(row.join(','))
      }

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${shipper.companyName}_loads_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    if (exportType === 'chain-of-custody' || exportType === 'all') {
      // CSV export for chain-of-custody logs
      const csvRows = [
        // Header
        ['Tracking Code', 'Event Code', 'Event Label', 'Actor Type', 'Actor ID', 'Location', 'Timestamp', 'Description'].join(',')
      ]

      for (const load of loads) {
        for (const event of load.trackingEvents) {
          const row = [
            load.publicTrackingCode,
            event.code,
            `"${event.label}"`,
            event.actorType || 'SYSTEM',
            event.actorId || '',
            event.locationText ? `"${event.locationText}"` : '',
            new Date(event.createdAt).toISOString(),
            event.description ? `"${event.description.replace(/"/g, '""')}"` : '',
          ]
          csvRows.push(row.join(','))
        }
      }

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${shipper.companyName}_chain_of_custody_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // For documents, return JSON with document metadata (actual files would need ZIP export)
    if (exportType === 'documents') {
      const documents = loads.flatMap(load =>
        load.documents.map(doc => ({
          trackingCode: load.publicTrackingCode,
          documentId: doc.id,
          type: doc.type,
          title: doc.title,
          uploadedBy: doc.uploadedBy,
          createdAt: doc.createdAt,
          fileHash: doc.fileHash,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          isLocked: doc.isLocked,
        }))
      )

      return NextResponse.json({
        shipper: {
          id: shipper.id,
          companyName: shipper.companyName,
        },
        documents,
        totalDocuments: documents.length,
        exportDate: new Date().toISOString(),
        note: 'Document files are available in the portal. File hashes are included for verification.',
      })
    }

    // AUDIT LOGGING: HIPAA Compliance - Log Export Action
    try {
      // Need auth session for logging
      const { getAuthSession } = await import('@/lib/auth-session')
      const { logUserAction } = await import('@/lib/audit-log')
      const auth = await getAuthSession(request as any)

      if (auth) {
        await logUserAction('EXPORT', 'SHIPPER', {
          entityId: shipper.id,
          userId: auth.userId,
          userType: auth.userType === 'driver' ? 'DRIVER' : auth.userType === 'shipper' ? 'SHIPPER' : 'ADMIN',
          req: request,
          metadata: {
            exportType,
            fileFormat: exportType === 'documents' ? 'JSON' : 'CSV',
            recordCount: exportType === 'documents' ? 0 : loads.length
          },
          severity: 'INFO',
          success: true
        })
      }
    } catch (logError) {
      console.error('Failed to log export action:', logError)
      // Non-blocking for export flow, but logged
    }

    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })

  } catch (error) {
    console.error('Error exporting shipper data:', error)
    return NextResponse.json(
      { error: 'Failed to export data', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

