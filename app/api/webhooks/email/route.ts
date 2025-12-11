// Email Webhook Handler
// Receives incoming emails from Resend and creates quote requests

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseEmailContent, detectServiceType, sanitizeEmailContent } from '@/lib/email-parser'
import { geocodeAddress } from '@/lib/geocoding'
import { calculateDistance } from '@/lib/distance-calculator'
import { calculateRate } from '@/lib/rate-calculator'
import {
  parseIncomingEmailWebhook,
  sendQuoteRequestConfirmation,
  sendAdminQuoteRequestNotification,
} from '@/lib/email'

/**
 * POST /api/webhooks/email
 * Handle incoming email webhooks from Resend
 */
export async function POST(request: NextRequest) {
  try {
    // Parse webhook payload
    const webhookData = await request.json()

    console.log('📧 Email webhook received:', {
      from: webhookData.from,
      subject: webhookData.subject,
    })

    // Verify webhook signature (if configured)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get('resend-signature')
      // TODO: Implement signature verification
      // For now, we'll accept all webhooks
    }

    // Parse email data from webhook
    const emailData = parseIncomingEmailWebhook(webhookData)

    if (!emailData) {
      console.error('Failed to parse email webhook data')
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      )
    }

    // Parse email content to extract information
    const parsedEmail = parseEmailContent(emailData)

    // Sanitize email content
    const sanitizedBody = sanitizeEmailContent(parsedEmail.body)

    // Find or create shipper
    let shipper = await prisma.shipper.findUnique({
      where: { email: parsedEmail.from },
    })

    if (!shipper) {
      // Create new shipper from email
      const companyName = parsedEmail.shipperCompany || 'Unknown Company'
      const contactName = parsedEmail.shipperName || 'Unknown'

      shipper = await prisma.shipper.create({
        data: {
          email: parsedEmail.from,
          companyName,
          contactName,
          clientType: 'OTHER',
          phone: parsedEmail.shipperPhone || '',
          isActive: true,
          paymentTerms: 'NET_14',
        },
      })

      console.log('✅ Created new shipper:', shipper.id)
    }

    // Determine service type from email content
    const serviceType = detectServiceType(parsedEmail.body, parsedEmail.subject)

    // Try to geocode addresses and calculate distance/rate
    let pickupFacilityId: string | undefined
    let dropoffFacilityId: string | undefined
    let autoCalculatedDistance: number | undefined
    let autoCalculatedTime: number | undefined
    let suggestedRateMin: number | undefined
    let suggestedRateMax: number | undefined

    if (parsedEmail.pickupAddress && parsedEmail.dropoffAddress) {
      try {
        // Geocode addresses
        const pickupGeocode = await geocodeAddress(parsedEmail.pickupAddress)
        const dropoffGeocode = await geocodeAddress(parsedEmail.dropoffAddress)

        if (pickupGeocode && dropoffGeocode) {
          // Create facilities
          const pickupFacility = await prisma.facility.create({
            data: {
              shipperId: shipper.id,
              name: 'Pickup Location',
              facilityType: 'OTHER',
              addressLine1: pickupGeocode.formattedAddress.split(',')[0] || '',
              city: pickupGeocode.city,
              state: pickupGeocode.state,
              postalCode: pickupGeocode.postalCode,
              contactName: shipper.contactName,
              contactPhone: shipper.phone,
            },
          })

          const dropoffFacility = await prisma.facility.create({
            data: {
              shipperId: shipper.id,
              name: 'Delivery Location',
              facilityType: 'OTHER',
              addressLine1: dropoffGeocode.formattedAddress.split(',')[0] || '',
              city: dropoffGeocode.city,
              state: dropoffGeocode.state,
              postalCode: dropoffGeocode.postalCode,
              contactName: shipper.contactName,
              contactPhone: shipper.phone,
            },
          })

          pickupFacilityId = pickupFacility.id
          dropoffFacilityId = dropoffFacility.id

          // Calculate distance
          const distanceResult = await calculateDistance(
            parsedEmail.pickupAddress,
            parsedEmail.dropoffAddress
          )

          if (distanceResult.success) {
            autoCalculatedDistance = distanceResult.distance
            autoCalculatedTime = distanceResult.duration

            // Calculate rate
            const rateResult = calculateRate(distanceResult.distance, serviceType)
            suggestedRateMin = rateResult.suggestedRateMin
            suggestedRateMax = rateResult.suggestedRateMax

            console.log('✅ Calculated distance and rate:', {
              distance: autoCalculatedDistance,
              rate: `$${suggestedRateMin} - $${suggestedRateMax}`,
            })
          }
        }
      } catch (error) {
        console.error('Error geocoding/calculating:', error)
        // Continue anyway - admin can fix manually
      }
    }

    // Generate tracking code
    const trackingCode = await generateTrackingCode()

    // Create LoadRequest with QUOTE_REQUESTED status
    const loadRequest = await prisma.loadRequest.create({
      data: {
        publicTrackingCode: trackingCode,
        shipperId: shipper.id,
        pickupFacilityId: pickupFacilityId || shipper.id, // Fallback to shipper ID (will need manual fix)
        dropoffFacilityId: dropoffFacilityId || shipper.id, // Fallback to shipper ID (will need manual fix)
        serviceType,
        commodityDescription: parsedEmail.description || 'See email for details',
        specimenCategory: 'OTHER',
        temperatureRequirement: 'AMBIENT',
        status: 'QUOTE_REQUESTED',
        createdVia: 'EMAIL',
        preferredContactMethod: 'EMAIL',

        // Email-specific fields
        rawEmailContent: sanitizedBody,
        emailSubject: parsedEmail.subject,
        emailFrom: parsedEmail.from,
        autoCalculatedDistance,
        autoCalculatedTime,
        suggestedRateMin,
        suggestedRateMax,
      },
      include: {
        shipper: true,
        pickupFacility: true,
        dropoffFacility: true,
      },
    })

    // Create initial tracking event
    await prisma.trackingEvent.create({
      data: {
        loadRequestId: loadRequest.id,
        code: 'REQUEST_RECEIVED',
        label: 'Quote Request Received',
        description: 'Quote request received via email',
        actorType: 'SHIPPER',
      },
    })

    console.log('✅ Created load request:', loadRequest.publicTrackingCode)

    // Send confirmation email to shipper
    const trackingUrl = `${process.env.NEXTAUTH_URL}/track?code=${trackingCode}`

    await sendQuoteRequestConfirmation({
      to: parsedEmail.from,
      trackingCode,
      companyName: shipper.companyName,
      pickupAddress: parsedEmail.pickupAddress,
      dropoffAddress: parsedEmail.dropoffAddress,
      trackingUrl,
    })

    // Send notification to admin
    const adminUrl = `${process.env.NEXTAUTH_URL}/admin/loads/${loadRequest.id}`

    await sendAdminQuoteRequestNotification({
      trackingCode,
      shipperName: shipper.companyName,
      shipperEmail: shipper.email,
      pickupAddress: parsedEmail.pickupAddress,
      dropoffAddress: parsedEmail.dropoffAddress,
      distance: autoCalculatedDistance,
      suggestedRate: suggestedRateMin && suggestedRateMax
        ? { min: suggestedRateMin, max: suggestedRateMax }
        : undefined,
      adminUrl,
    })

    return NextResponse.json({
      success: true,
      trackingCode,
      loadRequestId: loadRequest.id,
    })
  } catch (error) {
    console.error('❌ Error processing email webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate a unique tracking code
 */
async function generateTrackingCode(): Promise<string> {
  // Format: MED-YYYY-XXXX (e.g., MED-2024-0001)
  const year = new Date().getFullYear()
  const prefix = `MED-${year}-`

  // Find the latest tracking code for this year
  const latestLoad = await prisma.loadRequest.findFirst({
    where: {
      publicTrackingCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  let nextNumber = 1

  if (latestLoad) {
    const latestNumber = parseInt(latestLoad.publicTrackingCode.split('-')[2] || '0')
    nextNumber = latestNumber + 1
  }

  const trackingCode = `${prefix}${nextNumber.toString().padStart(4, '0')}`

  return trackingCode
}

