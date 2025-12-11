// Bulk Operations API Route
// POST: Perform bulk operations on load requests

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/load-requests/bulk
 * Perform bulk operations on load requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, loadRequestIds } = body

    if (!action || !Array.isArray(loadRequestIds) || loadRequestIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: action, loadRequestIds' },
        { status: 400 }
      )
    }

    let result: any = {}

    switch (action) {
      case 'update_status':
        const { status, eventLabel, eventDescription } = body
        if (!status) {
          return NextResponse.json(
            { error: 'Missing status for update_status action' },
            { status: 400 }
          )
        }

        const updated = await prisma.loadRequest.updateMany({
          where: {
            id: { in: loadRequestIds },
          },
          data: { status },
        })

        // Create tracking events for each load
        for (const loadId of loadRequestIds) {
          await prisma.trackingEvent.create({
            data: {
              loadRequestId: loadId,
              code: 'STATUS_UPDATED',
              label: eventLabel || 'Status Updated',
              description: eventDescription || null,
              actorType: 'ADMIN',
            },
          })
        }

        result = { updated: updated.count }
        break

      case 'assign_driver':
        const { driverId } = body
        if (!driverId) {
          return NextResponse.json(
            { error: 'Missing driverId for assign_driver action' },
            { status: 400 }
          )
        }

        const assigned = await prisma.loadRequest.updateMany({
          where: {
            id: { in: loadRequestIds },
          },
          data: { driverId },
        })

        result = { assigned: assigned.count }
        break

      case 'generate_invoices':
        // Generate invoices for completed loads
        const completedLoads = await prisma.loadRequest.findMany({
          where: {
            id: { in: loadRequestIds },
            status: { in: ['DELIVERED', 'COMPLETED'] },
            quoteAmount: { not: null },
            invoiceId: null,
          },
          include: {
            shipper: true,
          },
        })

        // Group by shipper
        const loadsByShipper = new Map<string, typeof completedLoads>()
        for (const load of completedLoads) {
          if (!loadsByShipper.has(load.shipperId)) {
            loadsByShipper.set(load.shipperId, [])
          }
          loadsByShipper.get(load.shipperId)!.push(load)
        }

        const invoicesGenerated: string[] = []
        for (const [shipperId, loads] of loadsByShipper.entries()) {
          try {
            const { createInvoice } = await import('@/lib/invoicing')
            const loadIds = loads.map((l) => l.id)
            const invoiceData = await createInvoice(shipperId, loadIds)
            invoicesGenerated.push(invoiceData.invoiceNumber)
          } catch (error) {
            console.error(`Error generating invoice for shipper ${shipperId}:`, error)
          }
        }

        result = { invoicesGenerated: invoicesGenerated.length, invoiceNumbers: invoicesGenerated }
        break

      case 'export_csv':
        // Return load data for CSV export
        const loads = await prisma.loadRequest.findMany({
          where: {
            id: { in: loadRequestIds },
          },
          include: {
            shipper: {
              select: {
                companyName: true,
              },
            },
            driver: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            pickupFacility: {
              select: {
                city: true,
                state: true,
                addressLine1: true,
              },
            },
            dropoffFacility: {
              select: {
                city: true,
                state: true,
                addressLine1: true,
              },
            },
          },
        })

        // Generate CSV
        const csvHeaders = [
          'Tracking Code',
          'Shipper',
          'Driver',
          'Status',
          'Service Type',
          'Pickup Address',
          'Dropoff Address',
          'Quote Amount',
          'Created At',
          'Delivered At',
        ]

        const csvRows = loads.map((load) => [
          load.publicTrackingCode,
          load.shipper?.companyName || '',
          load.driver ? `${load.driver.firstName} ${load.driver.lastName}` : '',
          load.status,
          load.serviceType,
          `${load.pickupFacility.addressLine1}, ${load.pickupFacility.city}, ${load.pickupFacility.state}`,
          `${load.dropoffFacility.addressLine1}, ${load.dropoffFacility.city}, ${load.dropoffFacility.state}`,
          load.quoteAmount?.toString() || '',
          load.createdAt.toISOString(),
          load.actualDeliveryTime?.toISOString() || '',
        ])

        // Escape CSV values
        const escapeCsv = (value: string) => {
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }

        const csvContent = [
          csvHeaders.map(escapeCsv).join(','),
          ...csvRows.map((row) => row.map((cell) => escapeCsv(String(cell || ''))).join(',')),
        ].join('\n')

        result = { csvContent, filename: `loads-export-${new Date().toISOString().split('T')[0]}.csv` }
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      loadRequestIds,
      result,
    })
  } catch (error) {
    console.error('Error performing bulk operation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}

