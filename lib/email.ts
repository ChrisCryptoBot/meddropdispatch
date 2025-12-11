// Email Utility Functions
// Handles sending emails via configured email service

import { sendEmail } from './email-service'

/**
 * Send a load confirmation email to shipper
 * Includes load details, rate information, and links to sign up/log in
 */
export async function sendLoadConfirmationEmail({
  to,
  companyName,
  trackingCode,
  loadDetails,
  rateInfo,
  baseUrl,
}: {
  to: string
  companyName: string
  trackingCode: string
  loadDetails: {
    pickupFacility: { name: string; addressLine1: string; city: string; state: string; postalCode: string }
    dropoffFacility: { name: string; addressLine1: string; city: string; state: string; postalCode: string }
    serviceType: string
    commodityDescription?: string | null
    readyTime?: Date | null
    deliveryDeadline?: Date | null
    driverName?: string | null
  }
  rateInfo?: {
    ratePerMile?: number | null
    totalDistance?: number | null
    quoteAmount?: number | null
  }
  baseUrl: string
}) {
  const trackingUrl = `${baseUrl}/track/${trackingCode}`
  const signupUrl = `${baseUrl}/shipper/signup?email=${encodeURIComponent(to)}&tracking=${trackingCode}`
  const loginUrl = `${baseUrl}/shipper/login?email=${encodeURIComponent(to)}&tracking=${trackingCode}`
  const viewLoadUrl = trackingUrl

  const subject = `MED DROP - Load Confirmation: ${trackingCode}`

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Not specified'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatServiceType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const text = `
Hello ${companyName},

Your load has been created and is now active!

TRACKING CODE: ${trackingCode}

LOAD DETAILS:
- Service Type: ${formatServiceType(loadDetails.serviceType)}
- Pickup: ${loadDetails.pickupFacility.name}, ${loadDetails.pickupFacility.addressLine1}, ${loadDetails.pickupFacility.city}, ${loadDetails.pickupFacility.state} ${loadDetails.pickupFacility.postalCode}
- Delivery: ${loadDetails.dropoffFacility.name}, ${loadDetails.dropoffFacility.addressLine1}, ${loadDetails.dropoffFacility.city}, ${loadDetails.dropoffFacility.state} ${loadDetails.dropoffFacility.postalCode}
${loadDetails.readyTime ? `- Ready Time: ${formatDate(loadDetails.readyTime)}` : ''}
${loadDetails.deliveryDeadline ? `- Delivery Deadline: ${formatDate(loadDetails.deliveryDeadline)}` : ''}
${loadDetails.commodityDescription ? `- Description: ${loadDetails.commodityDescription}` : ''}
${loadDetails.driverName ? `- Assigned Driver: ${loadDetails.driverName}` : ''}

${rateInfo?.quoteAmount ? `RATE: $${rateInfo.quoteAmount.toFixed(2)}` : rateInfo?.ratePerMile ? `RATE: $${rateInfo.ratePerMile.toFixed(2)} per mile${rateInfo.totalDistance ? ` (${rateInfo.totalDistance.toFixed(1)} miles)` : ''}` : ''}

TRACK YOUR SHIPMENT:
${trackingUrl}

CREATE AN ACCOUNT TO MANAGE YOUR LOADS:
${signupUrl}

ALREADY HAVE AN ACCOUNT? LOG IN:
${loginUrl}

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 5px 0 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .tracking-code { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .tracking-code .code { font-size: 32px; font-weight: bold; color: #0369a1; font-family: monospace; letter-spacing: 2px; }
    .section { margin: 25px 0; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #0ea5e9; }
    .section h3 { margin: 0 0 15px 0; color: #0369a1; font-size: 18px; }
    .detail-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; color: #6b7280; font-size: 14px; }
    .detail-value { color: #111827; margin-top: 4px; }
    .rate-box { background: #fdf4ff; border: 2px solid #d946ef; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .rate-box .rate-label { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
    .rate-box .rate-amount { font-size: 36px; font-weight: bold; color: #d946ef; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 10px 5px; font-weight: 600; text-align: center; }
    .button-secondary { background: #6b7280; }
    .button-success { background: #10b981; }
    .button-group { text-align: center; margin: 30px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
    .address { line-height: 1.8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MED DROP</h1>
      <p>Medical Courier Services</p>
    </div>
    <div class="content">
      <h2 style="margin-top: 0;">Load Confirmation</h2>
      <p>Hello ${companyName},</p>
      <p>Your load has been created and is now active! You can track it at any time using the tracking code below.</p>

      <div class="tracking-code">
        <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">TRACKING CODE</div>
        <div class="code">${trackingCode}</div>
      </div>

      <div class="section">
        <h3>Load Details</h3>
        <div class="detail-row">
          <div class="detail-label">Service Type</div>
          <div class="detail-value">${formatServiceType(loadDetails.serviceType)}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Pickup Location</div>
          <div class="detail-value address">
            <strong>${loadDetails.pickupFacility.name}</strong><br>
            ${loadDetails.pickupFacility.addressLine1}<br>
            ${loadDetails.pickupFacility.city}, ${loadDetails.pickupFacility.state} ${loadDetails.pickupFacility.postalCode}
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Delivery Location</div>
          <div class="detail-value address">
            <strong>${loadDetails.dropoffFacility.name}</strong><br>
            ${loadDetails.dropoffFacility.addressLine1}<br>
            ${loadDetails.dropoffFacility.city}, ${loadDetails.dropoffFacility.state} ${loadDetails.dropoffFacility.postalCode}
          </div>
        </div>
        ${loadDetails.readyTime ? `
        <div class="detail-row">
          <div class="detail-label">Ready Time</div>
          <div class="detail-value">${formatDate(loadDetails.readyTime)}</div>
        </div>
        ` : ''}
        ${loadDetails.deliveryDeadline ? `
        <div class="detail-row">
          <div class="detail-label">Delivery Deadline</div>
          <div class="detail-value">${formatDate(loadDetails.deliveryDeadline)}</div>
        </div>
        ` : ''}
        ${loadDetails.commodityDescription ? `
        <div class="detail-row">
          <div class="detail-label">Description</div>
          <div class="detail-value">${loadDetails.commodityDescription}</div>
        </div>
        ` : ''}
        ${loadDetails.driverName ? `
        <div class="detail-row">
          <div class="detail-label">Assigned Driver</div>
          <div class="detail-value">${loadDetails.driverName}</div>
        </div>
        ` : ''}
      </div>

      ${rateInfo && (rateInfo.quoteAmount || rateInfo.ratePerMile) ? `
      <div class="rate-box">
        <div class="rate-label">Rate Information</div>
        ${rateInfo.quoteAmount ? `
        <div class="rate-amount">$${rateInfo.quoteAmount.toFixed(2)}</div>
        ` : rateInfo.ratePerMile ? `
        <div class="rate-amount">$${rateInfo.ratePerMile.toFixed(2)}/mile</div>
        ${rateInfo.totalDistance ? `<div style="margin-top: 8px; color: #6b7280; font-size: 14px;">Total Distance: ${rateInfo.totalDistance.toFixed(1)} miles</div>` : ''}
        ` : ''}
      </div>
      ` : ''}

      <div class="button-group">
        <a href="${viewLoadUrl}" class="button">Track Your Shipment</a>
      </div>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h3 style="margin-top: 0; color: #1e40af;">Create an Account to Manage Your Loads</h3>
        <p style="margin-bottom: 15px;">Sign up for a free account to view all your loads, track shipments in real-time, access documents, and manage your account - all in one place!</p>
        <div class="button-group" style="margin: 20px 0 0 0;">
          <a href="${signupUrl}" class="button button-success">Sign Up Now</a>
          <a href="${loginUrl}" class="button button-secondary">Already Have Account? Log In</a>
        </div>
      </div>

      <div class="footer">
        <p><strong>MED DROP</strong> - Professional Medical Courier Services</p>
        <p>This is an automated confirmation email. Please do not reply to this email.</p>
        <p style="margin-top: 15px;">
          <a href="${trackingUrl}" style="color: #0ea5e9; text-decoration: none;">Track Shipment</a> | 
          <a href="${baseUrl}" style="color: #0ea5e9; text-decoration: none;">Visit Website</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  await sendEmail({ to, subject, text, html })
}

/**
 * Send a load status update email to shipper with ETA and status-specific content
 */
export async function sendLoadStatusEmail({
  to,
  trackingCode,
  companyName,
  status,
  statusLabel,
  trackingUrl,
  quoteAmount,
  quoteCurrency = 'USD',
  eta,
  driverName,
  pickupAddress,
  dropoffAddress,
}: {
  to: string
  trackingCode: string
  companyName: string
  status: string
  statusLabel: string
  trackingUrl: string
  quoteAmount?: number
  quoteCurrency?: string
  eta?: string | null
  driverName?: string | null
  pickupAddress?: string | null
  dropoffAddress?: string | null
}) {
  const subject = `MED DROP - Load ${trackingCode} Update: ${statusLabel}`

  // Status-specific messages
  let statusMessage = ''
  let statusIcon = '📦'
  
  switch (status) {
    case 'SCHEDULED':
      statusMessage = 'Your load has been scheduled and is ready for pickup!'
      statusIcon = '📅'
      break
    case 'PICKED_UP':
      statusMessage = 'Great news! Your shipment has been picked up and is now in transit.'
      statusIcon = '✅'
      break
    case 'IN_TRANSIT':
      statusMessage = 'Your shipment is currently in transit to the delivery location.'
      statusIcon = '🚚'
      break
    case 'EN_ROUTE':
      statusMessage = 'The driver is en route to the pickup location.'
      statusIcon = '🛣️'
      break
    case 'DELIVERED':
      statusMessage = 'Your shipment has been successfully delivered!'
      statusIcon = '🎉'
      break
    default:
      statusMessage = 'Your load status has been updated.'
  }

  const text = `
Hello ${companyName},

${statusMessage}

Tracking Code: ${trackingCode}
Status: ${statusLabel}
${driverName ? `Driver: ${driverName}` : ''}
${pickupAddress ? `Pickup: ${pickupAddress}` : ''}
${dropoffAddress ? `Delivery: ${dropoffAddress}` : ''}
${eta ? `Estimated Arrival: ${eta}` : ''}
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
    .eta { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .quote { background: #fdf4ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #d946ef; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
    .status-icon { font-size: 32px; margin-right: 10px; }
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
      <p>${statusMessage}</p>

      <div class="tracking-code">${statusIcon} ${trackingCode}</div>

      <div class="status">
        <strong>Status:</strong> ${statusLabel}
        ${driverName ? `<br><strong>Driver:</strong> ${driverName}` : ''}
        ${pickupAddress ? `<br><strong>Pickup:</strong> ${pickupAddress}` : ''}
        ${dropoffAddress ? `<br><strong>Delivery:</strong> ${dropoffAddress}` : ''}
      </div>

      ${eta ? `
      <div class="eta">
        <strong>⏰ Estimated Arrival:</strong> ${eta}
      </div>
      ` : ''}

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
  await sendEmail({ to, subject, text })
}

// Placeholder functions for other email types used in the codebase
export async function sendLoadCancelledNotification(params: any) {
  // Implementation placeholder
  console.log('sendLoadCancelledNotification called', params)
}

export async function sendDriverAcceptedNotification(params: any) {
  // Implementation placeholder
  console.log('sendDriverAcceptedNotification called', params)
}

export async function sendLoadScheduledNotification(params: any) {
  // Implementation placeholder
  console.log('sendLoadScheduledNotification called', params)
}

export async function sendLoadDeniedNotification(params: any) {
  // Implementation placeholder
  console.log('sendLoadDeniedNotification called', params)
}

export async function sendDriverQuoteNotification(params: any) {
  // Implementation placeholder
  console.log('sendDriverQuoteNotification called', params)
}

/**
 * Send driver confirmation email when load is submitted to load board
 */
export async function sendDriverConfirmationEmail({
  to,
  driverName,
  trackingCode,
  loadDetails,
  rateInfo,
  baseUrl,
}: {
  to: string
  driverName: string
  trackingCode: string
  loadDetails: {
    pickupFacility: { name: string; addressLine1: string; city: string; state: string; postalCode: string }
    dropoffFacility: { name: string; addressLine1: string; city: string; state: string; postalCode: string }
    serviceType: string
    commodityDescription?: string | null
    readyTime?: Date | null
    deliveryDeadline?: Date | null
    shipperName?: string | null
  }
  rateInfo?: {
    ratePerMile?: number | null
    totalDistance?: number | null
    quoteAmount?: number | null
  }
  baseUrl: string
}) {
  const subject = `MED DROP - Load Confirmation: ${trackingCode}`
  const driverPortalUrl = `${baseUrl}/driver/loads`
  const viewLoadUrl = `${baseUrl}/driver/loads`

  const text = `
Hello ${driverName},

Thank you for submitting your load to the MED DROP system! Your load has been successfully added to the load board.

TRACKING CODE: ${trackingCode}

LOAD DETAILS:
- Service Type: ${loadDetails.serviceType.replace(/_/g, ' ')}
- Commodity: ${loadDetails.commodityDescription || 'N/A'}
${loadDetails.readyTime ? `- Ready Time: ${loadDetails.readyTime.toLocaleString()}` : ''}
${loadDetails.deliveryDeadline ? `- Delivery Deadline: ${loadDetails.deliveryDeadline.toLocaleString()}` : ''}

PICKUP LOCATION:
${loadDetails.pickupFacility.name}
${loadDetails.pickupFacility.addressLine1}
${loadDetails.pickupFacility.city}, ${loadDetails.pickupFacility.state} ${loadDetails.pickupFacility.postalCode}

DELIVERY LOCATION:
${loadDetails.dropoffFacility.name}
${loadDetails.dropoffFacility.addressLine1}
${loadDetails.dropoffFacility.city}, ${loadDetails.dropoffFacility.state} ${loadDetails.dropoffFacility.postalCode}

${loadDetails.shipperName ? `SHIPPER: ${loadDetails.shipperName}` : ''}

${rateInfo?.quoteAmount ? `QUOTED RATE: $${rateInfo.quoteAmount.toFixed(2)}` : rateInfo?.ratePerMile ? `RATE: $${rateInfo.ratePerMile.toFixed(2)} per mile${rateInfo.totalDistance ? ` (${rateInfo.totalDistance.toFixed(1)} miles)` : ''}` : ''}

VIEW YOUR LOAD:
${viewLoadUrl}

Thank you for using MED DROP!

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
    .tracking-code { font-size: 28px; font-weight: bold; margin: 20px 0; text-align: center; color: #0369a1; }
    .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 6px; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Load Confirmation</h1>
      <p>MED DROP - Medical Courier Services</p>
    </div>
    <div class="content">
      <p>Hello <strong>${driverName}</strong>,</p>
      <p>Thank you for submitting your load to the MED DROP system! Your load has been successfully added to the load board.</p>

      <div class="tracking-code">${trackingCode}</div>

      <div class="section">
        <h3>Load Details</h3>
        <p><strong>Service Type:</strong> ${loadDetails.serviceType.replace(/_/g, ' ')}</p>
        ${loadDetails.commodityDescription ? `<p><strong>Commodity:</strong> ${loadDetails.commodityDescription}</p>` : ''}
        ${loadDetails.readyTime ? `<p><strong>Ready Time:</strong> ${loadDetails.readyTime.toLocaleString()}</p>` : ''}
        ${loadDetails.deliveryDeadline ? `<p><strong>Delivery Deadline:</strong> ${loadDetails.deliveryDeadline.toLocaleString()}</p>` : ''}
        ${loadDetails.shipperName ? `<p><strong>Shipper:</strong> ${loadDetails.shipperName}</p>` : ''}
      </div>

      <div class="section">
        <h3>Pickup Location</h3>
        <p><strong>${loadDetails.pickupFacility.name}</strong><br>
        ${loadDetails.pickupFacility.addressLine1}<br>
        ${loadDetails.pickupFacility.city}, ${loadDetails.pickupFacility.state} ${loadDetails.pickupFacility.postalCode}</p>
      </div>

      <div class="section">
        <h3>Delivery Location</h3>
        <p><strong>${loadDetails.dropoffFacility.name}</strong><br>
        ${loadDetails.dropoffFacility.addressLine1}<br>
        ${loadDetails.dropoffFacility.city}, ${loadDetails.dropoffFacility.state} ${loadDetails.dropoffFacility.postalCode}</p>
      </div>

      ${rateInfo && (rateInfo.quoteAmount || rateInfo.ratePerMile) ? `
      <div class="section" style="background: #fdf4ff; border-left: 4px solid #d946ef;">
        <h3>Rate Information</h3>
        ${rateInfo.quoteAmount ? `<p style="font-size: 24px; font-weight: bold; color: #d946ef;">$${rateInfo.quoteAmount.toFixed(2)}</p>` : ''}
        ${rateInfo.ratePerMile ? `<p><strong>Rate:</strong> $${rateInfo.ratePerMile.toFixed(2)}/mile</p>` : ''}
        ${rateInfo.totalDistance ? `<p><strong>Total Distance:</strong> ${rateInfo.totalDistance.toFixed(1)} miles</p>` : ''}
      </div>
      ` : ''}

      <div style="text-align: center;">
        <a href="${viewLoadUrl}" class="button">View Your Load</a>
      </div>

      <p>Thank you for using MED DROP! We appreciate your service.</p>

      <div class="footer">
        <p><strong>MED DROP</strong> - Professional Medical Courier Services</p>
        <p>This is an automated confirmation email. Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  await sendEmail({ to, subject, text, html })
}

/**
 * Send delivery congratulations email with invoice attachment
 */
export async function sendDeliveryCongratulationsEmail({
  to,
  companyName,
  trackingCode,
  deliveryTime,
  recipientName,
  invoicePdfBuffer,
  invoiceNumber,
  invoiceTotal,
  trackingUrl,
  baseUrl,
}: {
  to: string
  companyName: string
  trackingCode: string
  deliveryTime: Date
  recipientName?: string | null
  invoicePdfBuffer: Buffer
  invoiceNumber: string
  invoiceTotal: number
  trackingUrl: string
  baseUrl: string
}) {
  const subject = `🎉 Delivery Complete! Invoice Attached - ${trackingCode}`
  const invoiceBase64 = invoicePdfBuffer.toString('base64')

  const recipientInfo = recipientName ? `\nRECEIVED BY: ${recipientName}` : ''

  const text = `
🎉 Congratulations, ${companyName}!

Your shipment has been successfully delivered!

TRACKING CODE: ${trackingCode}
DELIVERY TIME: ${deliveryTime.toLocaleString()}${recipientInfo}

Your invoice is attached to this email.

Invoice Number: ${invoiceNumber}
Total Amount: $${invoiceTotal.toFixed(2)}

Track your shipment: ${trackingUrl}

Thank you for choosing MED DROP for your medical courier needs. We appreciate your business!

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
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .success-box { background: #d1fae5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .tracking-code { font-size: 28px; font-weight: bold; margin: 10px 0; color: #059669; }
    .invoice-box { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 32px;">🎉 Delivery Complete!</h1>
      <p style="margin: 10px 0 0 0;">MED DROP - Medical Courier Services</p>
    </div>
    <div class="content">
      <div class="success-box">
        <h2 style="margin: 0; color: #059669;">Congratulations, ${companyName}!</h2>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Your shipment has been successfully delivered!</p>
      </div>

      <div class="tracking-code">${trackingCode}</div>

      <p><strong>Delivery Time:</strong> ${deliveryTime.toLocaleString()}</p>
      ${recipientName ? `<p><strong>Received By:</strong> ${recipientName}</p>` : ''}

      <div class="invoice-box">
        <h3 style="margin-top: 0; color: #0369a1;">📄 Invoice Attached</h3>
        <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
        <p><strong>Total Amount:</strong> <span style="font-size: 24px; font-weight: bold; color: #0369a1;">$${invoiceTotal.toFixed(2)}</span></p>
        <p style="margin-bottom: 0;">Your invoice PDF is attached to this email for your records.</p>
      </div>

      <div style="text-align: center;">
        <a href="${trackingUrl}" class="button">View Delivery Details</a>
      </div>

      <p>Thank you for choosing MED DROP for your medical courier needs. We appreciate your business and look forward to serving you again!</p>

      <div class="footer">
        <p><strong>MED DROP</strong> - Professional Medical Courier Services</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
        <p>Questions? Contact us at support@meddrop.com</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim()

  await sendEmail({
    to,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `invoice-${invoiceNumber}.pdf`,
        content: invoiceBase64,
        contentType: 'application/pdf',
      },
    ],
  })
}

// Re-export sendEmail from email-service for backward compatibility
export { sendEmail } from './email-service'
