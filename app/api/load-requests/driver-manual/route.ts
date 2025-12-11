import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateTrackingCode } from '@/lib/tracking'
import { createErrorResponse, withErrorHandling } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/load-requests/driver-manual
 * Create a manual load record for driver documentation
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(req)
    } catch (error) {
      return createErrorResponse(error)
    }

    const data = await req.json()
    const { driverId, shipperId, ...loadData } = data

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    if (!shipperId) {
      return NextResponse.json(
        { error: 'Shipper ID is required' },
        { status: 400 }
      )
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    // Get the shipper
    const shipper = await prisma.shipper.findUnique({
      where: { id: shipperId },
    })

    if (!shipper) {
      return NextResponse.json(
        { error: 'Shipper not found' },
        { status: 404 }
      )
    }

    // Generate tracking code
    const publicTrackingCode = await generateTrackingCode(shipper.id)

    // Create or find pickup facility
    let pickupFacility = await prisma.facility.findFirst({
      where: {
        shipperId: shipper.id,
        name: loadData.pickupFacilityName || 'Manual Entry',
        addressLine1: loadData.pickupAddressLine1 || '',
        city: loadData.pickupCity || '',
      },
    })

    if (!pickupFacility) {
      pickupFacility = await prisma.facility.create({
        data: {
          shipperId: shipper.id,
          name: loadData.pickupFacilityName || 'Manual Entry',
          facilityType: 'OTHER',
          addressLine1: loadData.pickupAddressLine1 || '',
          addressLine2: null,
          city: loadData.pickupCity || '',
          state: (loadData.pickupState || 'XX').toUpperCase(),
          postalCode: loadData.pickupPostalCode || '',
          contactName: loadData.pickupContactName || '',
          contactPhone: loadData.pickupContactPhone || '',
          defaultAccessNotes: null,
        },
      })
    }

    // Create or find dropoff facility
    let dropoffFacility = await prisma.facility.findFirst({
      where: {
        shipperId: shipper.id,
        name: loadData.dropoffFacilityName || 'Manual Entry',
        addressLine1: loadData.dropoffAddressLine1 || '',
        city: loadData.dropoffCity || '',
      },
    })

    if (!dropoffFacility) {
      dropoffFacility = await prisma.facility.create({
        data: {
          shipperId: shipper.id,
          name: loadData.dropoffFacilityName || 'Manual Entry',
          facilityType: 'OTHER',
          addressLine1: loadData.dropoffAddressLine1 || '',
          addressLine2: null,
          city: loadData.dropoffCity || '',
          state: (loadData.dropoffState || 'XX').toUpperCase(),
          postalCode: loadData.dropoffPostalCode || '',
          contactName: loadData.dropoffContactName || '',
          contactPhone: loadData.dropoffContactPhone || '',
          defaultAccessNotes: null,
        },
      })
    }

    // Create load request
    const loadRequest = await prisma.loadRequest.create({
      data: {
        publicTrackingCode,
        shipperId: shipper.id,
        pickupFacilityId: pickupFacility.id,
        dropoffFacilityId: dropoffFacility.id,
        driverId: driverId,
        serviceType: loadData.serviceType || 'OTHER',
        commodityDescription: loadData.commodityDescription || 'Manual entry - see documents',
        specimenCategory: loadData.specimenCategory || 'OTHER',
        temperatureRequirement: loadData.temperatureRequirement || 'AMBIENT',
        // Scheduling
        readyTime: loadData.readyTime ? new Date(loadData.readyTime) : new Date(),
        deliveryDeadline: loadData.deliveryDeadline ? new Date(loadData.deliveryDeadline) : new Date(),
        isRecurring: loadData.isRecurring === true || loadData.isRecurring === 'true',
        directDriveRequired: loadData.directDriveRequired === true || loadData.directDriveRequired === 'true',
        // Compliance & Handling
        chainOfCustodyRequired: loadData.chainOfCustodyRequired === true || loadData.chainOfCustodyRequired === 'true',
        signatureRequiredAtPickup: loadData.signatureRequiredAtPickup !== false && loadData.signatureRequiredAtPickup !== 'false',
        signatureRequiredAtDelivery: loadData.signatureRequiredAtDelivery !== false && loadData.signatureRequiredAtDelivery !== 'false',
        electronicPodAcceptable: loadData.electronicPodAcceptable !== false && loadData.electronicPodAcceptable !== 'false',
        temperatureLoggingRequired: loadData.temperatureLoggingRequired === true || loadData.temperatureLoggingRequired === 'true',
        driverInstructions: loadData.driverInstructions || null,
        // Billing & Internal Ops
        poNumber: loadData.poNumber || null,
        priorityLevel: loadData.priorityLevel || 'NORMAL',
        tags: loadData.tags ? (typeof loadData.tags === 'string' ? loadData.tags : JSON.stringify(loadData.tags)) : null,
        // Notes
        accessNotes: loadData.notes || null,
        // Status & Assignment
        status: 'SCHEDULED', // Driver has already accepted, load is active and trackable
        createdVia: 'DRIVER_MANUAL',
        assignedAt: new Date(),
        acceptedByDriverAt: new Date(),
        // Include rate information if provided
        ratePerMile: loadData.ratePerMile || null,
        totalDistance: loadData.totalDistance || null,
        quoteAmount: loadData.quotedRate || loadData.quoteAmount || null,
      },
      include: {
        pickupFacility: true,
        dropoffFacility: true,
        driver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Create initial tracking event
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: loadRequest.id,
        code: 'REQUEST_RECEIVED',
        label: 'Load Created',
        description: `Load created by driver ${driver.firstName} ${driver.lastName} for ${shipper.companyName}. Load is active and trackable.`,
        locationText: null,
        actorId: driverId,
        actorType: 'DRIVER',
      },
    })

    // ALWAYS send confirmation emails to BOTH shipper and driver with warm greeting and load details
    // This is sent when load is submitted to load board
    try {
      const { sendLoadConfirmationEmail, sendDriverConfirmationEmail } = await import('@/lib/email')
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      
      // Get rate information if available
      const rateInfo = loadRequest.ratePerMile || loadRequest.quoteAmount ? {
        ratePerMile: loadRequest.ratePerMile,
        totalDistance: loadRequest.totalDistance,
        quoteAmount: loadRequest.quoteAmount,
      } : undefined

      // Send confirmation email to shipper
      await sendLoadConfirmationEmail({
        to: shipper.email,
        companyName: shipper.companyName,
        trackingCode: publicTrackingCode,
        loadDetails: {
          pickupFacility: {
            name: pickupFacility.name,
            addressLine1: pickupFacility.addressLine1,
            city: pickupFacility.city,
            state: pickupFacility.state,
            postalCode: pickupFacility.postalCode,
          },
          dropoffFacility: {
            name: dropoffFacility.name,
            addressLine1: dropoffFacility.addressLine1,
            city: dropoffFacility.city,
            state: dropoffFacility.state,
            postalCode: dropoffFacility.postalCode,
          },
          serviceType: loadRequest.serviceType,
          commodityDescription: loadRequest.commodityDescription,
          readyTime: loadRequest.readyTime,
          deliveryDeadline: loadRequest.deliveryDeadline,
          driverName: driver ? `${driver.firstName} ${driver.lastName}` : null,
        },
        rateInfo,
        baseUrl,
      })

      // Send confirmation email to driver
      if (driver && driver.email) {
        await sendDriverConfirmationEmail({
          to: driver.email,
          driverName: `${driver.firstName} ${driver.lastName}`,
          trackingCode: publicTrackingCode,
          loadDetails: {
            pickupFacility: {
              name: pickupFacility.name,
              addressLine1: pickupFacility.addressLine1,
              city: pickupFacility.city,
              state: pickupFacility.state,
              postalCode: pickupFacility.postalCode,
            },
            dropoffFacility: {
              name: dropoffFacility.name,
              addressLine1: dropoffFacility.addressLine1,
              city: dropoffFacility.city,
              state: dropoffFacility.state,
              postalCode: dropoffFacility.postalCode,
            },
            serviceType: loadRequest.serviceType,
            commodityDescription: loadRequest.commodityDescription,
            readyTime: loadRequest.readyTime,
            deliveryDeadline: loadRequest.deliveryDeadline,
            shipperName: shipper.companyName,
          },
          rateInfo,
          baseUrl,
        })
      }
    } catch (emailError) {
      console.error('Error sending confirmation emails:', emailError)
      // Don't fail the request if email fails - load exists regardless
      // But log it as it's important for customer communication
    }

    return NextResponse.json({
      success: true,
      trackingCode: publicTrackingCode,
      loadId: loadRequest.id,
    }, { status: 201 })
  })(request)
}

