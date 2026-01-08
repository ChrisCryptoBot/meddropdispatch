// Bulk Operations API Route
// POST: Perform bulk operations on load requests

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, withErrorHandling, ValidationError } from '@/lib/errors'
import { bulkActionSchema, validateRequest, formatZodErrors } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/load-requests/bulk
 * Perform bulk operations on load requests
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const rawBody = await req.json()
    
    // Validate request body
    const validation = await validateRequest(bulkActionSchema, rawBody)
    if (!validation.success) {
      const formatted = formatZodErrors(validation.errors)
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: formatted.message,
          errors: formatted.errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    const { action, loadRequestIds, status, driverId, eventLabel, eventDescription } = validation.data

    let result: any = {}

    switch (action) {
      case 'update_status':
        // status, eventLabel, eventDescription already destructured from validation.data above
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
        // driverId already destructured from validation.data above
        if (!driverId) {
          return NextResponse.json(
            { error: 'Missing driverId for assign_driver action' },
            { status: 400 }
          )
        }

        // EDGE CASE 6.4: Atomic Bulk Verification - Validate ALL loads before ANY assignment
        // This prevents partial success states and compliance violations
        const { validateDriverEligibility } = await import('@/lib/edge-case-validations')
        const { isMaintenanceCompliant } = await import('@/lib/vehicle-compliance')

        // Fetch all loads to validate
        const loadsToAssign = await prisma.loadRequest.findMany({
          where: {
            id: { in: loadRequestIds },
            driverId: null, // Only assign unassigned loads
            status: {
              in: ['NEW', 'REQUESTED', 'QUOTED', 'QUOTE_ACCEPTED'], // Only assignable statuses
            },
          },
          include: {
            shipper: {
              select: { id: true, companyName: true },
            },
          },
        })

        // Verify driver exists and is eligible
        const driver = await prisma.driver.findUnique({
          where: { id: driverId },
          include: {
            vehicles: {
              where: { isActive: true },
            },
          },
        })

        if (!driver) {
          throw new ValidationError('Driver not found')
        }

        // Check if driver has opted out of assignments
        if (driver.canBeAssignedLoads === false) {
          throw new ValidationError('Driver has opted out of load assignments. Cannot assign loads to this driver.')
        }

        // Validate driver has at least one active vehicle
        if (!driver.vehicles || driver.vehicles.length === 0) {
          throw new ValidationError('Driver must have at least one active vehicle to receive assignments')
        }

        // EDGE CASE 6.4: Atomic Verification - Check ALL loads for eligibility
        const validationErrors: Array<{ loadId: string; trackingCode: string; error: string }> = []
        
        for (const load of loadsToAssign) {
          try {
            // Validate driver eligibility for each load
            await validateDriverEligibility(driverId, {
              temperatureRequirement: load.temperatureRequirement || undefined,
              specimenCategory: load.specimenCategory || undefined,
              readyTime: load.readyTime || undefined,
              deliveryDeadline: load.deliveryDeadline || undefined,
            })

            // Check if driver has compliant vehicle (maintenance check)
            let hasCompliantVehicle = false
            for (const vehicle of driver.vehicles) {
              try {
                const maintenanceCompliance = await isMaintenanceCompliant(vehicle.id)
                if (maintenanceCompliance.status !== 'DUE') {
                  hasCompliantVehicle = true
                  break
                }
              } catch (error) {
                // If maintenance check fails, assume vehicle is not compliant for safety
                continue
              }
            }

            if (!hasCompliantVehicle) {
              validationErrors.push({
                loadId: load.id,
                trackingCode: load.publicTrackingCode,
                error: 'Driver has no maintenance-compliant vehicles available',
              })
              continue
            }

            // Additional validations can be added here (e.g., vehicle compliance, certifications)
          } catch (error) {
            validationErrors.push({
              loadId: load.id,
              trackingCode: load.publicTrackingCode,
              error: error instanceof Error ? error.message : 'Driver eligibility check failed',
            })
          }
        }

        // EDGE CASE 6.4: If ANY load fails validation, REJECT ENTIRE BATCH (atomic operation)
        if (validationErrors.length > 0) {
          const failedCodes = validationErrors.map(e => e.trackingCode).join(', ')
          const errorMessages = validationErrors.map(e => `${e.trackingCode}: ${e.error}`).join('; ')
          
          return NextResponse.json(
            {
              error: 'BulkAssignmentValidationFailed',
              message: `Bulk assignment rejected: ${validationErrors.length} of ${loadsToAssign.length} loads failed validation. All loads must pass validation before any assignment occurs.`,
              details: {
                totalLoads: loadsToAssign.length,
                passed: loadsToAssign.length - validationErrors.length,
                failed: validationErrors.length,
                failedLoads: validationErrors,
                failedTrackingCodes: failedCodes,
                errorMessages,
              },
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          )
        }

        // All loads passed validation - proceed with atomic assignment
        // Use transaction to ensure all-or-nothing assignment
        const assigned = await prisma.$transaction(async (tx) => {
          // Update all loads atomically
          const updated = await tx.loadRequest.updateMany({
            where: {
              id: { in: loadsToAssign.map(l => l.id) },
            },
            data: {
              driverId,
              assignedAt: new Date(),
              status: 'SCHEDULED', // Auto-schedule assigned loads
              // Snapshot contractedFleetId if driver is in a fleet
              contractedFleetId: driver.fleetId || null,
            },
          })

          // Create tracking events for each load
          for (const load of loadsToAssign) {
            await tx.trackingEvent.create({
              data: {
                loadRequestId: load.id,
                code: 'DRIVER_ASSIGNED',
                label: `Assigned to ${driver.firstName} ${driver.lastName}`,
                description: 'Bulk assignment via dispatch board',
                actorType: 'ADMIN',
              },
            })
          }

          return updated
        })

        result = {
          assigned: assigned.count,
          totalValidated: loadsToAssign.length,
          message: `Successfully assigned ${assigned.count} load${assigned.count !== 1 ? 's' : ''} to ${driver.firstName} ${driver.lastName}`,
        }
        break

      case 'generate_invoices':
        // Generate invoices for completed loads
        const completedLoads = await prisma.loadRequest.findMany({
          where: {
            id: { in: loadRequestIds },
            status: { in: ['DELIVERED'] },
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
  })(request)
}

