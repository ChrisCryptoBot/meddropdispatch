// Email Webhook Handler
// Receives incoming emails from Resend and creates quote requests

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseEmailContent, detectServiceType, sanitizeEmailContent } from '@/lib/email-parser'
import { geocodeAddress } from '@/lib/geocoding'
import { calculateDistance } from '@/lib/distance-calculator'
import { calculateRate } from '@/lib/rate-calculator'
// Email functions are implemented inline below
import {
  sendNewQuoteRequestSMS,
} from '@/lib/sms'
import crypto from 'crypto'
import { createErrorResponse, withErrorHandling, ValidationError, AuthenticationError } from '@/lib/errors'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/webhooks/email
 * Handle incoming email webhooks from Resend
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async (req: Request | NextRequest) => {
    // Apply more lenient rate limiting for webhooks
    try {
      rateLimit(RATE_LIMITS.webhook)(request)
    } catch (error) {
      return createErrorResponse(error)
    }

    // Get raw body for signature verification before parsing JSON
    const rawBody = await req.text()
    const webhookData = JSON.parse(rawBody)

    console.log('📧 Email webhook received:', {
      from: webhookData.from,
      subject: webhookData.subject,
    })

    // Verify webhook signature (if configured)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (webhookSecret) {
      const signature = request.headers.get('resend-signature') || request.headers.get('x-resend-signature')
      
      if (!signature) {
        console.error('Webhook signature missing')
        return NextResponse.json(
          { error: 'Missing webhook signature' },
          { status: 401 }
        )
      }

      // Get raw body for signature verification
      const rawBody = JSON.stringify(webhookData)
      
      // Resend uses HMAC SHA-256
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex')
      
      // Compare signatures (constant-time comparison to prevent timing attacks)
      const providedSignature = signature.replace('sha256=', '')
      
      if (!crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(providedSignature)
      )) {
        console.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
      
      console.log('✅ Webhook signature verified')
    }

    // Parse email data from webhook (inline implementation)
    // Resend webhook format: { from, to, subject, text, html, ... }
    const emailData = {
      from: webhookData.from?.email || webhookData.from,
      to: webhookData.to || [],
      subject: webhookData.subject || '',
      text: webhookData.text || '',
      html: webhookData.html || '',
      date: webhookData.date || new Date().toISOString(),
    }

    if (!emailData.from || !emailData.subject) {
      console.error('Failed to parse email webhook data - missing required fields')
      return NextResponse.json(
        { error: 'Invalid webhook data - missing from or subject' },
        { status: 400 }
      )
    }

    // Parse email content to extract information
    const parsedEmail = parseEmailContent({
      from: emailData.from,
      subject: emailData.subject,
      body: emailData.text || emailData.html || '',
    })

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

            // Calculate rate (no timing info available from email, so no after-hours detection)
            const rateResult = calculateRate(distanceResult.distance, serviceType, null, null)
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

    // Send confirmation email to shipper (using existing email service)
    const trackingUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/track?code=${trackingCode}`
    const { sendEmail } = await import('@/lib/email-service')
    
    try {
      await sendEmail({
        to: parsedEmail.from,
        subject: `MED DROP - Quote Request Received: ${trackingCode}`,
        text: `Hello ${shipper.companyName},\n\nYour quote request has been received and assigned tracking code: ${trackingCode}\n\nPickup: ${parsedEmail.pickupAddress || 'TBD'}\nDelivery: ${parsedEmail.dropoffAddress || 'TBD'}\n\nTrack your request: ${trackingUrl}\n\nThank you for choosing MED DROP!`,
        html: `<html><body><h2>MED DROP - Quote Request Received</h2><p>Hello ${shipper.companyName},</p><p>Your quote request has been received and assigned tracking code: <strong>${trackingCode}</strong></p><p><strong>Pickup:</strong> ${parsedEmail.pickupAddress || 'TBD'}<br><strong>Delivery:</strong> ${parsedEmail.dropoffAddress || 'TBD'}</p><p><a href="${trackingUrl}">Track your request</a></p><p>Thank you for choosing MED DROP!</p></body></html>`,
      })
    } catch (emailError) {
      console.error('Failed to send quote request confirmation email:', emailError)
      // Don't fail the webhook if email fails
    }

    // Send notification to admin (using existing email service)
    const adminUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/loads/${loadRequest.id}`
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@meddrop.com'
    
    try {
      await sendEmail({
        to: adminEmail,
        subject: `New Quote Request: ${trackingCode}`,
        text: `New quote request received:\n\nTracking Code: ${trackingCode}\nShipper: ${shipper.companyName} (${shipper.email})\nPickup: ${parsedEmail.pickupAddress || 'TBD'}\nDelivery: ${parsedEmail.dropoffAddress || 'TBD'}${autoCalculatedDistance ? `\nDistance: ${autoCalculatedDistance.toFixed(1)} miles` : ''}${suggestedRateMin && suggestedRateMax ? `\nSuggested Rate: $${suggestedRateMin} - $${suggestedRateMax}` : ''}\n\nView in admin portal: ${adminUrl}`,
        html: `<html><body><h2>New Quote Request</h2><p><strong>Tracking Code:</strong> ${trackingCode}</p><p><strong>Shipper:</strong> ${shipper.companyName} (${shipper.email})</p><p><strong>Pickup:</strong> ${parsedEmail.pickupAddress || 'TBD'}<br><strong>Delivery:</strong> ${parsedEmail.dropoffAddress || 'TBD'}</p>${autoCalculatedDistance ? `<p><strong>Distance:</strong> ${autoCalculatedDistance.toFixed(1)} miles</p>` : ''}${suggestedRateMin && suggestedRateMax ? `<p><strong>Suggested Rate:</strong> $${suggestedRateMin} - $${suggestedRateMax}</p>` : ''}<p><a href="${adminUrl}">View in admin portal</a></p></body></html>`,
      })
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError)
      // Don't fail the webhook if email fails
    }

    // Create in-app notification for admins
    const route = parsedEmail.pickupAddress && parsedEmail.dropoffAddress
      ? `${parsedEmail.pickupAddress} → ${parsedEmail.dropoffAddress}`
      : 'Route to be determined'

    await prisma.notification.create({
      data: {
        userId: null, // Broadcast to all admins
        type: 'QUOTE_REQUEST',
        title: `New Quote Request: ${trackingCode}`,
        message: `${shipper.companyName} - ${route}`,
        link: adminUrl,
      },
    })

    // Create notification for ALL drivers (since all drivers are admins)
    // This ensures drivers see potential leads contacting via email
    const { notifyAllDriversCompanyEmailReceived } = await import('@/lib/notifications')
    await notifyAllDriversCompanyEmailReceived({
      fromEmail: parsedEmail.from,
      subject: parsedEmail.subject,
      message: sanitizedBody,
      trackingCode,
      loadRequestId: loadRequest.id,
    }).catch((error) => {
      console.error('Error creating driver notifications for company email:', error)
      // Don't fail the webhook if notification creation fails
    })

    // Send SMS to admin (if configured) - NON-BLOCKING: SMS failures should not prevent webhook processing
    const adminPhone = process.env.ADMIN_PHONE_NUMBER
    if (adminPhone) {
      sendNewQuoteRequestSMS({
        adminPhone,
        trackingCode,
        shipperName: shipper.companyName,
        route: parsedEmail.pickupAddress && parsedEmail.dropoffAddress
          ? `${parsedEmail.pickupAddress.split(',')[0]} → ${parsedEmail.dropoffAddress.split(',')[0]}`
          : 'Route TBD',
      }).catch((error) => {
        console.error('[SMS] Failed to send new quote request SMS (non-blocking):', error)
      })
    }

    return NextResponse.json({
      success: true,
      trackingCode,
      loadRequestId: loadRequest.id,
    })
  })(request)
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

