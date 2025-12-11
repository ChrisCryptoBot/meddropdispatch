// SMS Service using Twilio
// Sends SMS notifications for time-sensitive alerts

import { Twilio } from 'twilio'

// Initialize Twilio client (only if credentials are provided)
let twilioClient: Twilio | null = null

try {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (accountSid && authToken) {
    twilioClient = new Twilio(accountSid, authToken)
  } else {
    console.warn('Twilio credentials not configured. SMS notifications will be disabled.')
  }
} catch (error) {
  console.error('Failed to initialize Twilio client:', error)
}

interface SendSMSOptions {
  to: string
  message: string
  from?: string
}

/**
 * Send an SMS message using Twilio
 */
export async function sendSMS({ to, message, from }: SendSMSOptions): Promise<boolean> {
  // If Twilio is not configured, log and return false
  if (!twilioClient) {
    console.log('[SMS] Twilio not configured. Would send SMS:', { to, message })
    return false
  }

  try {
    // Use provided 'from' number or default from environment
    const fromNumber = from || process.env.TWILIO_PHONE_NUMBER

    if (!fromNumber) {
      console.error('[SMS] No Twilio phone number configured')
      return false
    }

    // Format phone number (basic validation)
    const formattedTo = formatPhoneNumber(to)
    if (!formattedTo) {
      console.error('[SMS] Invalid phone number:', to)
      return false
    }

    // Send SMS
    const result = await twilioClient.messages.create({
      to: formattedTo,
      from: fromNumber,
      body: message,
    })

    console.log('[SMS] Message sent successfully:', {
      sid: result.sid,
      to: formattedTo,
      status: result.status,
    })

    return true
  } catch (error: any) {
    console.error('[SMS] Failed to send message:', error.message)
    return false
  }
}

/**
 * Format phone number to E.164 format (+1XXXXXXXXXX)
 */
function formatPhoneNumber(phone: string): string | null {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // If it's 10 digits, assume US number and add +1
  if (digits.length === 10) {
    return `+1${digits}`
  }

  // If it's 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  // If it already starts with +, return as is
  if (phone.startsWith('+')) {
    return phone
  }

  // Otherwise, invalid format
  return null
}

/**
 * Send SMS notification for new quote request (to admin)
 */
export async function sendNewQuoteRequestSMS(params: {
  adminPhone: string
  trackingCode: string
  shipperName: string
  route: string
}) {
  const { adminPhone, trackingCode, shipperName, route } = params

  const message = `🚨 New Quote Request\n${trackingCode}\nFrom: ${shipperName}\nRoute: ${route}\n\nReview at: ${process.env.NEXT_PUBLIC_APP_URL || 'https://meddrop.com'}/admin`

  return sendSMS({
    to: adminPhone,
    message,
  })
}

/**
 * Send SMS notification when driver is assigned (to shipper)
 */
export async function sendDriverAssignedSMS(params: {
  shipperPhone: string
  trackingCode: string
  driverName: string
}) {
  const { shipperPhone, trackingCode, driverName } = params

  const message = `✅ Driver Assigned\n${trackingCode}\nDriver: ${driverName}\n\nTrack your delivery: ${process.env.NEXT_PUBLIC_APP_URL || 'https://meddrop.com'}/track/${trackingCode}`

  return sendSMS({
    to: shipperPhone,
    message,
  })
}

/**
 * Send SMS notification when driver is en route to pickup (to shipper)
 */
export async function sendDriverEnRouteSMS(params: {
  shipperPhone: string
  trackingCode: string
  driverName: string
  estimatedArrival?: string
}) {
  const { shipperPhone, trackingCode, driverName, estimatedArrival } = params

  let message = `🚗 Driver En Route\n${trackingCode}\nDriver: ${driverName}`

  if (estimatedArrival) {
    message += `\nETA: ${estimatedArrival}`
  }

  message += `\n\nTrack: ${process.env.NEXT_PUBLIC_APP_URL || 'https://meddrop.com'}/track/${trackingCode}`

  return sendSMS({
    to: shipperPhone,
    message,
  })
}

/**
 * Send SMS notification when delivery is complete (to shipper)
 */
export async function sendDeliveryCompleteSMS(params: {
  shipperPhone: string
  trackingCode: string
  deliveryTime: string
}) {
  const { shipperPhone, trackingCode, deliveryTime } = params

  const message = `✅ Delivery Complete\n${trackingCode}\nDelivered at: ${deliveryTime}\n\nView receipt: ${process.env.NEXT_PUBLIC_APP_URL || 'https://meddrop.com'}/track/${trackingCode}`

  return sendSMS({
    to: shipperPhone,
    message,
  })
}

/**
 * Send SMS notification for load status update
 */
export async function sendLoadStatusUpdateSMS(params: {
  phone: string
  trackingCode: string
  status: string
  message?: string
}) {
  const { phone, trackingCode, status, message: customMessage } = params

  const defaultMessage = `📦 Status Update\n${trackingCode}\nStatus: ${status}\n\nTrack: ${process.env.NEXT_PUBLIC_APP_URL || 'https://meddrop.com'}/track/${trackingCode}`

  return sendSMS({
    to: phone,
    message: customMessage || defaultMessage,
  })
}


