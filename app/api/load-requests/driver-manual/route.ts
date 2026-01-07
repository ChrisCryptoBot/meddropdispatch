import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateTrackingCode } from '@/lib/tracking'
import { createErrorResponse, withErrorHandling, ValidationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/load-requests/driver-manual
 * Create a manual load record for driver documentation
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply rate limiting
    try {
      rateLimit(RATE_LIMITS.api)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    const data = await req.json()
    const { driverId, shipperId, assignedDriverId, companyName, email, contactName, phone, clientType, ...loadData } = data

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    // Determine which driver to assign (assignedDriverId takes precedence, otherwise use creator driverId)
    const finalAssignedDriverId = assignedDriverId || driverId

    // Track if shipper is new (will be created)
    let isNewShipper = false

    // If no shipperId but companyName provided, create new shipper
    let finalShipperId = shipperId
    if (!shipperId && companyName) {
      // Check if shipper with this email already exists
      let existingShipper = null
      if (email) {
        existingShipper = await prisma.shipper.findUnique({
          where: { email: email.toLowerCase() },
        })
      }

      if (existingShipper) {
        finalShipperId = existingShipper.id
      } else {
        isNewShipper = true // Mark as new shipper
        // Create new shipper
        if (!email || !contactName || !phone) {
          return NextResponse.json(
            { error: 'Email, contact name, and phone are required to create a new shipper' },
            { status: 400 }
          )
        }

        // Check if email is blocked (DNU list)
        try {
          const blockedEmail = await prisma.blockedEmail.findUnique({
            where: { email: email.toLowerCase() },
          })

          if (blockedEmail && blockedEmail.isActive) {
            return NextResponse.json(
              {
                error: 'Email address is blocked',
                message: 'This email address has been blocked and cannot be used.',
              },
              { status: 403 }
            )
          }
        } catch (error) {
          console.warn('BlockedEmail check skipped:', error)
        }

        const newShipper = await prisma.shipper.create({
          data: {
            companyName: companyName,
            clientType: clientType || 'OTHER',
            contactName: contactName,
            phone: phone,
            email: email.toLowerCase(),
            isActive: true,
          },
        })
        finalShipperId = newShipper.id
      }
    }

    if (!finalShipperId) {
      return NextResponse.json(
        { error: 'Shipper ID or company name is required' },
        { status: 400 }
      )
    }

    // Verify creator driver exists
    const creatorDriver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { id: true, firstName: true, lastName: true },
    })

    if (!creatorDriver) {
      return NextResponse.json(
        { error: 'Creator driver not found' },
        { status: 404 }
      )
    }

    // Verify assigned driver exists (if different from creator)
    let assignedDriver: { id: string; firstName: string; lastName: string; phone?: string; email?: string } | null = creatorDriver
    if (assignedDriverId && assignedDriverId !== driverId) {
      assignedDriver = await prisma.driver.findUnique({
        where: { id: assignedDriverId },
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      })

      if (!assignedDriver) {
        return NextResponse.json(
          { error: 'Assigned driver not found' },
          { status: 404 }
        )
      }
    } else {
      // Get full driver info for creator if they're the assigned driver
      const fullCreatorDriver = await prisma.driver.findUnique({
        where: { id: driverId },
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      })
      if (fullCreatorDriver) {
        assignedDriver = fullCreatorDriver
      }
    }

    // Get the shipper
    const shipper = await prisma.shipper.findUnique({
      where: { id: finalShipperId },
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

    // LIABILITY SHIELD: Validate vehicle compliance if vehicleId is provided (Hard Stop)
    if (loadData.vehicleId) {
      const { validateVehicleCompliance } = await import('@/lib/vehicle-compliance')
      try {
        await validateVehicleCompliance(loadData.vehicleId)
      } catch (complianceError) {
        throw new ValidationError(
          complianceError instanceof Error
            ? complianceError.message
            : 'Vehicle compliance check failed. Cannot create load with non-compliant vehicle.'
        )
      }
    }

    // Create load request
    const loadRequest = await prisma.loadRequest.create({
      data: {
        publicTrackingCode,
        shipperId: shipper.id,
        pickupFacilityId: pickupFacility.id,
        dropoffFacilityId: dropoffFacility.id,
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
        driverId: finalAssignedDriverId, // Assign to selected driver or creator
        vehicleId: loadData.vehicleId || null, // Assign vehicle if provided
        assignedAt: new Date(),
        acceptedByDriverAt: finalAssignedDriverId === driverId ? new Date() : null, // Only set if creator is assigned
        gpsTrackingEnabled: loadData.gpsTrackingEnabled || false, // GPS tracking preference
        gpsTrackingStartedAt: (loadData.gpsTrackingEnabled && finalAssignedDriverId) ? new Date() : null, // Start GPS tracking if enabled
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
        code: 'SCHEDULED',
        label: 'Load Created & Scheduled',
        description: `Load created by driver ${creatorDriver.firstName} ${creatorDriver.lastName}${assignedDriverId && assignedDriverId !== driverId ? ` and assigned to driver ${assignedDriver.firstName} ${assignedDriver.lastName}` : ''} for ${shipper.companyName}. Load is active and trackable.`,
        locationText: null,
        actorId: driverId, // Creator driver
        actorType: 'DRIVER',
      },
    })

    // If shipper is new, send welcome email FIRST, then load confirmation
    if (isNewShipper) {
      const { sendShipperWelcomeEmail } = await import('@/lib/email')
      await sendShipperWelcomeEmail({
        to: shipper.email,
        companyName: shipper.companyName,
        contactName: shipper.contactName,
        email: shipper.email,
      })
    }

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
          driverName: assignedDriver ? `${assignedDriver.firstName} ${assignedDriver.lastName}` : null,
        },
        rateInfo,
        baseUrl,
      })

      // Send confirmation email to assigned driver (if different from creator)
      if (assignedDriver && assignedDriver.email && assignedDriver.id !== creatorDriver.id) {
        await sendDriverConfirmationEmail({
          to: assignedDriver.email,
          driverName: `${assignedDriver.firstName} ${assignedDriver.lastName}`,
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

