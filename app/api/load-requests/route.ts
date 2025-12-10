import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateTrackingCode } from '@/lib/tracking'
import { sendLoadStatusEmail, sendNewLoadNotification } from '@/lib/email'
import { getTrackingUrl } from '@/lib/utils'
import type { LoadRequestFormData } from '@/lib/types'

/**
 * POST /api/load-requests
 * Create a new load request from the public form
 */
export async function POST(request: NextRequest) {
  try {
    const data: LoadRequestFormData = await request.json()

    // Generate unique tracking code
    const publicTrackingCode = await generateTrackingCode()

    // Find or create shipper
    let shipper = await prisma.shipper.findFirst({
      where: { email: data.email.toLowerCase() }
    })

    if (!shipper) {
      shipper = await prisma.shipper.create({
        data: {
          companyName: data.companyName,
          clientType: data.clientType as any,
          contactName: data.contactName,
          phone: data.phone,
          email: data.email.toLowerCase(),
        }
      })
    }

    // Create or find pickup facility
    let pickupFacility = await prisma.facility.findFirst({
      where: {
        shipperId: shipper.id,
        name: data.pickupFacilityName,
        addressLine1: data.pickupAddressLine1,
        city: data.pickupCity,
        state: data.pickupState,
      }
    })

    if (!pickupFacility) {
      pickupFacility = await prisma.facility.create({
        data: {
          shipperId: shipper.id,
          name: data.pickupFacilityName,
          facilityType: data.pickupFacilityType as any,
          addressLine1: data.pickupAddressLine1,
          addressLine2: data.pickupAddressLine2 || null,
          city: data.pickupCity,
          state: data.pickupState.toUpperCase(),
          postalCode: data.pickupPostalCode,
          contactName: data.pickupContactName,
          contactPhone: data.pickupContactPhone,
          defaultAccessNotes: data.pickupAccessNotes || null,
        }
      })
    }

    // Create or find dropoff facility
    let dropoffFacility = await prisma.facility.findFirst({
      where: {
        shipperId: shipper.id,
        name: data.dropoffFacilityName,
        addressLine1: data.dropoffAddressLine1,
        city: data.dropoffCity,
        state: data.dropoffState,
      }
    })

    if (!dropoffFacility) {
      dropoffFacility = await prisma.facility.create({
        data: {
          shipperId: shipper.id,
          name: data.dropoffFacilityName,
          facilityType: data.dropoffFacilityType as any,
          addressLine1: data.dropoffAddressLine1,
          addressLine2: data.dropoffAddressLine2 || null,
          city: data.dropoffCity,
          state: data.dropoffState.toUpperCase(),
          postalCode: data.dropoffPostalCode,
          contactName: data.dropoffContactName,
          contactPhone: data.dropoffContactPhone,
          defaultAccessNotes: data.dropoffAccessNotes || null,
        }
      })
    }

    // Create load request
    const loadRequest = await prisma.loadRequest.create({
      data: {
        publicTrackingCode,
        shipperId: shipper.id,
        pickupFacilityId: pickupFacility.id,
        dropoffFacilityId: dropoffFacility.id,
        serviceType: data.serviceType as any,
        commodityDescription: data.commodityDescription,
        specimenCategory: data.specimenCategory as any,
        temperatureRequirement: data.temperatureRequirement as any,
        estimatedContainers: data.estimatedContainers ? parseInt(data.estimatedContainers.toString()) : null,
        estimatedWeightKg: data.estimatedWeightKg ? parseFloat(data.estimatedWeightKg.toString()) : null,
        declaredValue: data.declaredValue ? parseFloat(data.declaredValue.toString()) : null,
        readyTime: data.readyTime ? new Date(data.readyTime) : null,
        deliveryDeadline: data.deliveryDeadline ? new Date(data.deliveryDeadline) : null,
        accessNotes: data.accessNotes || null,
        preferredContactMethod: data.preferredContactMethod as any,
        status: 'NEW',
        createdVia: 'WEB_FORM',
      }
    })

    // Create initial tracking event
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: loadRequest.id,
        code: 'REQUEST_RECEIVED',
        label: 'Request Received',
        description: 'Your load request has been received and is being reviewed by our team.',
        locationText: `${pickupFacility.city}, ${pickupFacility.state}`,
      }
    })

    // Send confirmation email to shipper
    const trackingUrl = getTrackingUrl(publicTrackingCode)
    await sendLoadStatusEmail({
      to: shipper.email,
      trackingCode: publicTrackingCode,
      companyName: shipper.companyName,
      status: 'NEW',
      statusLabel: 'Request Received',
      trackingUrl,
    })

    // Send notification to internal team
    await sendNewLoadNotification({
      loadId: loadRequest.id,
      trackingCode: publicTrackingCode,
      companyName: shipper.companyName,
      serviceType: data.serviceType,
      pickupCity: pickupFacility.city,
      dropoffCity: dropoffFacility.city,
    })

    return NextResponse.json({
      success: true,
      trackingCode: publicTrackingCode,
      loadId: loadRequest.id,
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating load request:', error)
    return NextResponse.json(
      { error: 'Failed to create load request', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
