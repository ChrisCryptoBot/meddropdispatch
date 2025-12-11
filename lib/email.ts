// Email Notification Service
// Integrated with Resend: https://resend.com

import { Resend } from 'resend'

export interface EmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

// Initialize Resend client
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Default sender email (can be overridden via environment variable)
const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'MedDrop.Dispatch@outlook.com'
const FROM_NAME = process.env.RESEND_FROM_NAME || 'MED DROP'

/**
 * Send an email notification using Resend
 * Falls back to console logging if Resend API key is not configured
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  // If Resend is not configured, log to console (development mode)
  if (!resend || !process.env.RESEND_API_KEY) {
    console.log('📧 EMAIL NOTIFICATION (Console - Resend not configured):')
    console.log('To:', options.to)
    console.log('Subject:', options.subject)
    console.log('Text:', options.text)
    if (options.html) {
      console.log('HTML:', options.html.substring(0, 200) + '...')
    }
    console.log('---')
    console.log('⚠️  To enable real email sending, add RESEND_API_KEY to your .env file')
    return
  }

  try {
    // Send email via Resend
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text, // Use HTML if provided, otherwise use text
    })

    console.log('✅ Email sent successfully:', {
      to: options.to,
      subject: options.subject,
      emailId: result.data?.id,
    })

    return
  } catch (error) {
    // Log error but don't throw (fail gracefully)
    console.error('❌ Failed to send email via Resend:', error)
    console.log('📧 Email details (failed to send):')
    console.log('To:', options.to)
    console.log('Subject:', options.subject)
    console.log('---')
    
    // In production, you might want to:
    // - Log to error tracking service (Sentry, etc.)
    // - Queue email for retry
    // - Send to admin notification service
  }
}

/**
 * Send a load status update email to the shipper
 */
export async function sendLoadStatusEmail({
  to,
  trackingCode,
  companyName,
  status,
  statusLabel,
  trackingUrl,
  quoteAmount,
  quoteCurrency,
}: {
  to: string
  trackingCode: string
  companyName: string
  status: string
  statusLabel: string
  trackingUrl: string
  quoteAmount?: number
  quoteCurrency?: string
}) {
  const subject = `MED DROP - Load ${trackingCode} Update: ${statusLabel}`

  const text = `
Hello ${companyName},

Your load request ${trackingCode} has been updated.

Status: ${statusLabel}
${quoteAmount ? `Quote: ${quoteCurrency}${quoteAmount.toFixed(2)}` : ''}

Track your shipment: ${trackingUrl}

Thank you for choosing MED DROP for your medical courier needs.

---
MED DROP
Medical Courier Services
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .tracking-code { font-size: 24px; font-weight: bold; margin: 10px 0; }
    .status { background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
    .quote { background: #fdf4ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #d946ef; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MED DROP</h1>
      <p>Medical Courier Services</p>
    </div>
    <div class="content">
      <h2>Load Status Update</h2>
      <p>Hello ${companyName},</p>
      <p>Your load request has been updated:</p>

      <div class="tracking-code">${trackingCode}</div>

      <div class="status">
        <strong>Status:</strong> ${statusLabel}
      </div>

      ${quoteAmount ? `
      <div class="quote">
        <strong>Quote:</strong> ${quoteCurrency}${quoteAmount.toFixed(2)}
      </div>
      ` : ''}

      <a href="${trackingUrl}" class="button">Track Your Shipment</a>

      <p>Thank you for choosing MED DROP for your medical courier needs.</p>

      <div class="footer">
        <p>MED DROP - Professional Medical Courier Services</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  await sendEmail({ to, subject, text, html })
}

/**
 * Send a new load request notification to internal team
 */
export async function sendNewLoadNotification({
  loadId,
  trackingCode,
  companyName,
  serviceType,
  pickupCity,
  dropoffCity,
}: {
  loadId: string
  trackingCode: string
  companyName: string
  serviceType: string
  pickupCity: string
  dropoffCity: string
}) {
  // TODO: Configure internal notification email
  const internalEmail = process.env.INTERNAL_NOTIFICATION_EMAIL || 'dispatch@meddrop.com'

  const subject = `🚨 New Load Request: ${trackingCode} - ${serviceType}`

  const text = `
New load request received!

Tracking Code: ${trackingCode}
Company: ${companyName}
Service Type: ${serviceType}
Route: ${pickupCity} → ${dropoffCity}

Review and quote: ${process.env.NEXTAUTH_URL}/admin/loads/${loadId}
  `.trim()

  await sendEmail({ to: internalEmail, subject, text })
}

/**
 * Send load status update email to driver
 */
export async function sendDriverLoadStatusEmail({
  to,
  driverName,
  trackingCode,
  status,
  statusLabel,
  companyName,
  pickupAddress,
  dropoffAddress,
  readyTime,
  deliveryDeadline,
  driverPortalUrl,
}: {
  to: string
  driverName: string
  trackingCode: string
  status: string
  statusLabel: string
  companyName: string
  pickupAddress: string
  dropoffAddress: string
  readyTime?: Date | null
  deliveryDeadline?: Date | null
  driverPortalUrl?: string
}) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const portalUrl = driverPortalUrl || `${baseUrl}/driver/loads`

  const subject = `MED DROP - Load ${trackingCode} Update: ${statusLabel}`

  const text = `
Hello ${driverName},

Your assigned load ${trackingCode} has been updated.

Status: ${statusLabel}
Shipper: ${companyName}
Pickup: ${pickupAddress}
Delivery: ${dropoffAddress}
${readyTime ? `Ready Time: ${readyTime.toLocaleString()}` : ''}
${deliveryDeadline ? `Delivery Deadline: ${deliveryDeadline.toLocaleString()}` : ''}

View in driver portal: ${portalUrl}

Thank you for your service with MED DROP.

---
MED DROP
Medical Courier Services
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .tracking-code { font-size: 24px; font-weight: bold; margin: 10px 0; color: #059669; }
    .status { background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669; }
    .info-box { background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #0ea5e9; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MED DROP</h1>
      <p>Driver Portal - Medical Courier Services</p>
    </div>
    <div class="content">
      <h2>Load Status Update</h2>
      <p>Hello ${driverName},</p>
      <p>Your assigned load has been updated:</p>

      <div class="tracking-code">${trackingCode}</div>

      <div class="status">
        <strong>Status:</strong> ${statusLabel}
      </div>

      <div class="info-box">
        <strong>Shipper:</strong> ${companyName}<br>
        <strong>Pickup:</strong> ${pickupAddress}<br>
        <strong>Delivery:</strong> ${dropoffAddress}
        ${readyTime ? `<br><strong>Ready Time:</strong> ${readyTime.toLocaleString()}` : ''}
        ${deliveryDeadline ? `<br><strong>Delivery Deadline:</strong> ${deliveryDeadline.toLocaleString()}` : ''}
      </div>

      <a href="${portalUrl}" class="button">View in Driver Portal</a>

      <p>Thank you for your service with MED DROP.</p>

      <div class="footer">
        <p>MED DROP - Professional Medical Courier Services</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  await sendEmail({ to, subject, text, html })
}

/**
 * Send notification to shipper when driver accepts their load
 */
export async function sendDriverAcceptedNotification({
  to,
  companyName,
  trackingCode,
  driverName,
  driverPhone,
  trackingUrl,
}: {
  to: string
  companyName: string
  trackingCode: string
  driverName: string
  driverPhone: string
  trackingUrl: string
}) {
  const subject = `MED DROP - Driver Assigned to Load ${trackingCode}`

  const text = `
Hello ${companyName},

Great news! A driver has accepted your scheduling request.

Tracking Code: ${trackingCode}
Driver: ${driverName}
Driver Phone: ${driverPhone}

The driver will call you shortly to confirm details and pricing.

Track your shipment: ${trackingUrl}

Thank you for choosing MED DROP.

---
MED DROP
Medical Courier Services
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .tracking-code { font-size: 24px; font-weight: bold; margin: 10px 0; }
    .success-box { background: #ecfdf5; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669; }
    .info-box { background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #0ea5e9; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .phone { font-size: 20px; font-weight: bold; color: #059669; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MED DROP</h1>
      <p>Medical Courier Services</p>
    </div>
    <div class="content">
      <h2>Driver Assigned</h2>
      <p>Hello ${companyName},</p>

      <div class="success-box">
        <strong>✅ Great news!</strong> A driver has accepted your scheduling request.
      </div>

      <div class="tracking-code">${trackingCode}</div>

      <div class="info-box">
        <strong>Driver Name:</strong> ${driverName}<br>
        <strong>Driver Phone:</strong> <span class="phone">${driverPhone}</span>
      </div>

      <p><strong>The driver will call you shortly</strong> to confirm details and pricing before the delivery is scheduled.</p>

      <a href="${trackingUrl}" class="button">Track Your Shipment</a>

      <p>Thank you for choosing MED DROP.</p>

      <div class="footer">
        <p>MED DROP - Professional Medical Courier Services</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  await sendEmail({ to, subject, text, html })
}

/**
 * Send notification when load is scheduled (after driver acceptance)
 */
export async function sendLoadScheduledNotification({
  shipperEmail,
  driverEmail,
  companyName,
  driverName,
  trackingCode,
  trackingUrl,
  driverPortalUrl,
  pickupAddress,
  dropoffAddress,
  readyTime,
  deliveryDeadline,
}: {
  shipperEmail: string
  driverEmail?: string | null
  companyName: string
  driverName: string
  trackingCode: string
  trackingUrl: string
  driverPortalUrl?: string
  pickupAddress: string
  dropoffAddress: string
  readyTime?: Date | null
  deliveryDeadline?: Date | null
}) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const portalUrl = driverPortalUrl || `${baseUrl}/driver/loads`

  // Notify shipper
  await sendLoadStatusEmail({
    to: shipperEmail,
    trackingCode,
    companyName,
    status: 'SCHEDULED',
    statusLabel: 'Delivery Scheduled',
    trackingUrl,
  })

  // Notify driver if email available
  if (driverEmail) {
    await sendDriverLoadStatusEmail({
      to: driverEmail,
      driverName,
      trackingCode,
      status: 'SCHEDULED',
      statusLabel: 'Delivery Scheduled',
      companyName,
      pickupAddress,
      dropoffAddress,
      readyTime,
      deliveryDeadline,
      driverPortalUrl: portalUrl,
    })
  }
}

/**
 * Send notification to shipper when driver denies a load
 */
export async function sendLoadDeniedNotification({
  to,
  companyName,
  trackingCode,
  reason,
  notes,
  trackingUrl,
}: {
  to: string
  companyName: string
  trackingCode: string
  reason: string
  notes?: string | null
  trackingUrl: string
}) {
  const reasonLabel = reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  const subject = `MED DROP - Load ${trackingCode} Not Scheduled`

  const text = `
Hello ${companyName},

We regret to inform you that your scheduling request ${trackingCode} could not be accommodated at this time.

Reason: ${reasonLabel}
${notes ? `Notes: ${notes}` : ''}

Your request will remain in our system. You can submit a new request with adjusted details, or we may be able to accommodate it on a future date.

If you have questions, please contact us at support@meddrop.com

---
MED DROP
Medical Courier Services
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .tracking-code { font-size: 24px; font-weight: bold; margin: 10px 0; }
    .notice-box { background: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .info-box { background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #0ea5e9; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MED DROP</h1>
      <p>Medical Courier Services</p>
    </div>
    <div class="content">
      <h2>Scheduling Request Not Scheduled</h2>
      <p>Hello ${companyName},</p>

      <div class="notice-box">
        <strong>We regret to inform you</strong> that your scheduling request could not be accommodated at this time.
      </div>

      <div class="tracking-code">${trackingCode}</div>

      <div class="info-box">
        <strong>Reason:</strong> ${reasonLabel}
        ${notes ? `<br><strong>Notes:</strong> ${notes}` : ''}
      </div>

      <p>Your request will remain in our system. You can submit a new request with adjusted details, or we may be able to accommodate it on a future date.</p>

      <a href="${trackingUrl}" class="button">View Request Details</a>

      <p>If you have questions, please contact us at <strong>support@meddrop.com</strong></p>

      <div class="footer">
        <p>MED DROP - Professional Medical Courier Services</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  await sendEmail({ to, subject, text, html })
}

/**
 * Send cancellation notification to both shipper and driver
 */
export async function sendLoadCancelledNotification({
  shipperEmail,
  driverEmail,
  companyName,
  driverName,
  trackingCode,
  cancellationReason,
  cancelledBy,
  notes,
  trackingUrl,
  driverPortalUrl,
}: {
  shipperEmail: string
  driverEmail?: string | null
  companyName: string
  driverName?: string | null
  trackingCode: string
  cancellationReason: string
  cancelledBy: string
  notes?: string | null
  trackingUrl: string
  driverPortalUrl?: string
}) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const portalUrl = driverPortalUrl || `${baseUrl}/driver/loads`

  const reasonLabel = cancellationReason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  // Notify shipper
  const shipperSubject = `MED DROP - Load ${trackingCode} Cancelled`
  const shipperText = `
Hello ${companyName},

Your load request ${trackingCode} has been cancelled.

Reason: ${reasonLabel}
Cancelled by: ${cancelledBy}
${notes ? `Notes: ${notes}` : ''}

Track your shipments: ${trackingUrl}

If you have questions, please contact us at support@meddrop.com

---
MED DROP
Medical Courier Services
  `.trim()

  await sendEmail({
    to: shipperEmail,
    subject: shipperSubject,
    text: shipperText,
  })

  // Notify driver if email available
  if (driverEmail && driverName) {
    await sendDriverLoadStatusEmail({
      to: driverEmail,
      driverName,
      trackingCode,
      status: 'CANCELLED',
      statusLabel: `Cancelled - ${reasonLabel}`,
      companyName,
      pickupAddress: 'N/A',
      dropoffAddress: 'N/A',
      driverPortalUrl: portalUrl,
    })
  }
}
