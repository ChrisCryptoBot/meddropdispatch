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
  driverInfo,
  gpsTrackingEnabled = false,
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
  driverInfo?: {
    name: string
    phone: string
    email: string
    vehicle?: {
      type: string
      make?: string | null
      model?: string | null
      plate: string
      nickname?: string | null
    } | null
  }
  gpsTrackingEnabled?: boolean
}) {
  const trackingUrl = `${baseUrl}/track/${trackingCode}`
  const signupUrl = `${baseUrl}/shipper/signup?email=${encodeURIComponent(to)}&tracking=${trackingCode}`
  const loginUrl = `${baseUrl}/shipper/login?email=${encodeURIComponent(to)}&tracking=${trackingCode}`
  const viewLoadUrl = trackingUrl
  const gpsTrackingUrl = gpsTrackingEnabled ? `${baseUrl}/track/${trackingCode}#gps` : null

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

${driverInfo ? `
DRIVER INFORMATION:
- Driver Name: ${driverInfo.name}
- Phone: ${driverInfo.phone}
${driverInfo.vehicle ? `- Vehicle: ${driverInfo.vehicle.nickname || driverInfo.vehicle.type}${driverInfo.vehicle.make && driverInfo.vehicle.model ? ` (${driverInfo.vehicle.make} ${driverInfo.vehicle.model})` : ''}${driverInfo.vehicle.plate ? ` - Plate: ${driverInfo.vehicle.plate}` : ''}` : ''}
` : ''}

${rateInfo?.quoteAmount ? `RATE: $${rateInfo.quoteAmount.toFixed(2)}` : rateInfo?.ratePerMile ? `RATE: $${rateInfo.ratePerMile.toFixed(2)} per mile${rateInfo.totalDistance ? ` (${rateInfo.totalDistance.toFixed(1)} miles)` : ''}` : ''}

TRACK YOUR SHIPMENT:
${trackingUrl}
${gpsTrackingEnabled && gpsTrackingUrl ? `
LIVE GPS TRACKING:
${gpsTrackingUrl}
View real-time driver location on the tracking page.
` : ''}

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
      </div>

      ${driverInfo ? `
      <div class="section" style="background: #f0fdf4; border-left: 4px solid #10b981;">
        <h3 style="color: #059669;">Driver Information</h3>
        <div class="detail-row">
          <div class="detail-label">Driver Name</div>
          <div class="detail-value">${driverInfo.name}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Phone</div>
          <div class="detail-value">
            <a href="tel:${driverInfo.phone}" style="color: #0ea5e9; text-decoration: none; font-weight: 600;">${driverInfo.phone}</a>
          </div>
        </div>
        ${driverInfo.vehicle ? `
        <div class="detail-row">
          <div class="detail-label">Vehicle</div>
          <div class="detail-value">
            ${driverInfo.vehicle.nickname || driverInfo.vehicle.type}
            ${driverInfo.vehicle.make && driverInfo.vehicle.model ? ` (${driverInfo.vehicle.make} ${driverInfo.vehicle.model})` : ''}
            ${driverInfo.vehicle.plate ? ` - Plate: ${driverInfo.vehicle.plate}` : ''}
          </div>
        </div>
        ` : ''}
      </div>
      ` : ''}

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
        ${gpsTrackingEnabled && gpsTrackingUrl ? `
        <a href="${gpsTrackingUrl}" class="button" style="background: #10b981;">View Live GPS Tracking</a>
        ` : ''}
      </div>

      ${gpsTrackingEnabled ? `
      <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h3 style="margin-top: 0; color: #059669; display: flex; align-items: center; gap: 8px;">
          <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Live GPS Tracking Enabled
        </h3>
        <p style="margin-bottom: 15px; color: #047857;">Your driver has enabled real-time GPS tracking for this delivery. You can view their exact location on the tracking page, which includes both UPS-style status updates and a live GPS map showing the driver's current position.</p>
        <div class="button-group" style="margin: 20px 0 0 0;">
          <a href="${gpsTrackingUrl}" class="button" style="background: #10b981;">View GPS Map & Tracking</a>
        </div>
      </div>
      ` : `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <h3 style="margin-top: 0; color: #1e40af;">Track Your Shipment</h3>
        <p style="margin-bottom: 15px;">Use the tracking link above to view real-time status updates, delivery timeline, and all shipment details. You'll see UPS-style tracking with status updates at each milestone.</p>
      </div>
      `}

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

/**
 * Send welcome email to new driver
 */
export async function sendDriverWelcomeEmail({
  to,
  firstName,
  lastName,
  email,
}: {
  to: string
  firstName: string
  lastName: string
  email: string
}) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const dashboardUrl = `${baseUrl}/driver/dashboard`
  const loginUrl = `${baseUrl}/driver/login`
  
  const subject = `Welcome to MED DROP, ${firstName}`

  const text = `
Welcome to MED DROP, ${firstName}!

Your driver account has been successfully created. We're excited to have you join our team of professional medical couriers.

YOUR ACCOUNT DETAILS:
- Email: ${email}
- Name: ${firstName} ${lastName}

GET STARTED:
1. Access your driver dashboard: ${dashboardUrl}
2. View available loads on the load board
3. Accept loads that fit your schedule
4. Update load status as you complete pickups and deliveries
5. Track your earnings and completed loads

KEY FEATURES:
- Real-time load board with all available jobs
- Smart Route optimization for multiple loads
- Digital signature capture for proof of delivery
- Temperature logging for refrigerated loads
- Document upload for POD, BOL, and more
- Earnings tracking and payout management

SUPPORT:
If you have any questions or need assistance, please don't hesitate to reach out to our support team.

We're here to help you succeed.

Thank you for choosing MED DROP. Let's get started!

---
MED DROP
Medical Courier Services
Professional. Reliable. Trusted.
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #0284c7; }
    .feature { background: #f8fafc; padding: 15px; margin: 10px 0; border-left: 4px solid #0ea5e9; border-radius: 4px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">Welcome to MED DROP</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Your driver account is ready</p>
    </div>
    
    <div class="content">
      <p style="font-size: 18px; color: #1e40af;"><strong>Hello ${firstName},</strong></p>
      
      <p>Your driver account has been successfully created. We're excited to have you join our team of professional medical couriers.</p>
      
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e40af;">Your Account Details</h3>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>Name:</strong> ${firstName} ${lastName}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" class="button">Access Your Dashboard</a>
      </div>
      
      <h3 style="color: #1e40af; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">Get Started</h3>
      <ol style="line-height: 2;">
        <li>Access your driver dashboard to view available loads</li>
        <li>Browse the load board and accept loads that fit your schedule</li>
        <li>Update load status as you complete pickups and deliveries</li>
        <li>Upload documents and capture signatures for proof of delivery</li>
        <li>Track your earnings and completed loads</li>
      </ol>
      
      <h3 style="color: #1e40af; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; margin-top: 30px;">Key Features</h3>
      
      <div class="feature">
        <strong>Real-Time Load Board</strong><br>
        View all available medical courier jobs in your area with real-time updates
      </div>
      
      <div class="feature">
        <strong>Smart Route Optimization</strong><br>
        Get AI-suggested routes for multiple loads to maximize efficiency and minimize drive time
      </div>
      
      <div class="feature">
        <strong>Digital Signature Capture</strong><br>
        Capture signatures for proof of pickup and delivery directly from your device
      </div>
      
      <div class="feature">
        <strong>Temperature Logging</strong><br>
        Record temperatures for refrigerated and frozen loads with precise timestamps
      </div>
      
      <div class="feature">
        <strong>Document Management</strong><br>
        Upload proof of delivery, bills of lading, and other required documents instantly
      </div>
      
      <div class="feature">
        <strong>Earnings Tracking</strong><br>
        Monitor your completed loads and earnings in real-time with detailed reporting
      </div>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0;"><strong>Need Help?</strong></p>
        <p style="margin: 5px 0 0 0;">If you have any questions or need assistance, our support team is here to help. Don't hesitate to reach out!</p>
      </div>
      
      <p style="margin-top: 30px; font-size: 16px; color: #1e40af;"><strong>Thank you for choosing MED DROP. Let's get started!</strong></p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;"><strong>MED DROP</strong></p>
      <p style="margin: 5px 0;">Medical Courier Services</p>
      <p style="margin: 5px 0;">Professional. Reliable. Trusted.</p>
      <p style="margin: 15px 0 0 0; font-size: 12px;">This is an automated welcome email. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  await sendEmail({ to, subject, text, html })
}

/**
 * Send welcome email to new shipper
 */
export async function sendShipperWelcomeEmail({
  to,
  companyName,
  contactName,
  email,
}: {
  to: string
  companyName: string
  contactName: string
  email: string
}) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const dashboardUrl = `${baseUrl}/shipper/dashboard`
  const requestLoadUrl = `${baseUrl}/request-load`
  const loginUrl = `${baseUrl}/shipper/login`
  
  const subject = `Welcome to MED DROP, ${companyName}`

  const text = `
Welcome to MED DROP, ${contactName}!

Your shipper account has been successfully created. We're thrilled to have ${companyName} as part of the MED DROP family.

YOUR ACCOUNT DETAILS:
- Company: ${companyName}
- Contact: ${contactName}
- Email: ${email}

GET STARTED:
1. Access your shipper dashboard: ${dashboardUrl}
2. Request new loads through the portal
3. Track all your shipments in real-time
4. View and download documents uploaded by drivers
5. Review invoices and payment history

KEY FEATURES:
- Real-time shipment tracking
- Load request management
- Document access (POD, BOL, etc.)
- Invoice management and payment tracking
- Email notifications for status updates
- Complete shipment history

SUPPORT:
If you have any questions or need assistance, please don't hesitate to reach out to our support team.

We're here to help you succeed.

Thank you for choosing MED DROP. We look forward to serving you!

---
MED DROP
Medical Courier Services
Professional. Reliable. Trusted.
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #0284c7; }
    .button-secondary { display: inline-block; background: #64748b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button-secondary:hover { background: #475569; }
    .feature { background: #f8fafc; padding: 15px; margin: 10px 0; border-left: 4px solid #0ea5e9; border-radius: 4px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">Welcome to MED DROP</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Your shipper account is ready</p>
    </div>
    
    <div class="content">
      <p style="font-size: 18px; color: #1e40af;"><strong>Hello ${contactName},</strong></p>
      
      <p>Your shipper account has been successfully created. We're thrilled to have <strong>${companyName}</strong> as part of the MED DROP family.</p>
      
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1e40af;">Your Account Details</h3>
        <p style="margin: 5px 0;"><strong>Company:</strong> ${companyName}</p>
        <p style="margin: 5px 0;"><strong>Contact:</strong> ${contactName}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" class="button">Access Your Dashboard</a>
        <br>
        <a href="${requestLoadUrl}" class="button-secondary" style="margin-top: 10px;">Request a Load</a>
      </div>
      
      <h3 style="color: #1e40af; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">Get Started</h3>
      <ol style="line-height: 2;">
        <li>Access your shipper dashboard to view all your loads</li>
        <li>Request new loads through the portal or by calling us</li>
        <li>Track all your shipments in real-time</li>
        <li>View and download documents uploaded by drivers</li>
        <li>Review invoices and payment history</li>
      </ol>
      
      <h3 style="color: #1e40af; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; margin-top: 30px;">Key Features</h3>
      
      <div class="feature">
        <strong>Real-Time Tracking</strong><br>
        Track all your shipments from pickup to delivery with live status updates and estimated arrival times
      </div>
      
      <div class="feature">
        <strong>Load Management</strong><br>
        View and manage all your load requests in one convenient dashboard with comprehensive filtering and search
      </div>
      
      <div class="feature">
        <strong>Document Access</strong><br>
        Access proof of delivery, bills of lading, and other documents uploaded by drivers instantly
      </div>
      
      <div class="feature">
        <strong>Invoice Management</strong><br>
        View invoices, payment history, and manage billing information with detailed financial reporting
      </div>
      
      <div class="feature">
        <strong>Email Notifications</strong><br>
        Receive automatic email updates for load status changes, deliveries, and important milestones
      </div>
      
      <div class="feature">
        <strong>Complete History</strong><br>
        Access your complete shipment history for records, reporting, and compliance documentation
      </div>
      
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0;"><strong>Need to Book a Load?</strong></p>
        <p style="margin: 5px 0 0 0;">Shippers must call to book loads. Use the portal to track and manage your shipments.</p>
      </div>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0;"><strong>Need Help?</strong></p>
        <p style="margin: 5px 0 0 0;">If you have any questions or need assistance, our support team is here to help. Don't hesitate to reach out!</p>
      </div>
      
      <p style="margin-top: 30px; font-size: 16px; color: #1e40af;"><strong>Thank you for choosing MED DROP. We look forward to serving you!</strong></p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;"><strong>MED DROP</strong></p>
      <p style="margin: 5px 0;">Medical Courier Services</p>
      <p style="margin: 5px 0;">Professional. Reliable. Trusted.</p>
      <p style="margin: 15px 0 0 0; font-size: 12px;">This is an automated welcome email. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  await sendEmail({ to, subject, text, html })
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

/**
 * Send forgot password email with username and temporary password
 */
export async function sendForgotPasswordEmail({
  to,
  firstName,
  lastName,
  username,
  temporaryPassword,
  loginUrl,
}: {
  to: string
  firstName: string
  lastName: string
  username: string
  temporaryPassword: string
  loginUrl: string
}) {
  const subject = `MED DROP - Password Reset Request`
  const fullName = `${firstName} ${lastName}`.trim() || 'Driver'

  const text = `
Hello ${fullName},

You requested a password reset for your MED DROP driver account.

YOUR LOGIN CREDENTIALS:
Username (Email): ${username}
Temporary Password: ${temporaryPassword}

IMPORTANT SECURITY NOTICE:
- This is a temporary password that has been set for your account
- Please log in immediately and change your password to something secure
- Do not share this password with anyone
- If you did not request this password reset, please contact support immediately

LOG IN NOW:
${loginUrl}

After logging in, please go to your Profile settings to change your password to something more secure.

Thank you for using MED DROP.

---
MED DROP
Medical Courier Services
Professional. Reliable. Trusted.

This is an automated email. Please do not reply to this email.
If you have questions, contact support@meddrop.com
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .credentials-box { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credential-row { margin: 15px 0; padding: 12px; background: white; border-radius: 6px; border-left: 4px solid #0ea5e9; }
    .credential-label { font-weight: 600; color: #0369a1; margin-bottom: 5px; }
    .credential-value { font-size: 18px; font-family: 'Courier New', monospace; color: #1e40af; font-weight: bold; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #0284c7; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">MED DROP - Driver Portal</p>
    </div>
    
    <div class="content">
      <p style="font-size: 18px; color: #1e40af;"><strong>Hello ${fullName},</strong></p>
      
      <p>You requested a password reset for your MED DROP driver account.</p>
      
      <div class="credentials-box">
        <h3 style="margin-top: 0; color: #0369a1; text-align: center;">Your Login Credentials</h3>
        
        <div class="credential-row">
          <div class="credential-label">Username (Email):</div>
          <div class="credential-value">${username}</div>
        </div>
        
        <div class="credential-row">
          <div class="credential-label">Temporary Password:</div>
          <div class="credential-value">${temporaryPassword}</div>
        </div>
      </div>
      
      <div class="warning-box">
        <p style="margin: 0;"><strong>⚠️ Important Security Notice:</strong></p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>This is a temporary password that has been set for your account</li>
          <li>Please log in immediately and change your password to something secure</li>
          <li>Do not share this password with anyone</li>
          <li>If you did not request this password reset, please contact support immediately</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" class="button">Log In Now</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">After logging in, please go to your <strong>Profile</strong> settings to change your password to something more secure.</p>
      
      <p style="margin-top: 30px;">Thank you for using MED DROP.</p>
    </div>
    
    <div class="footer">
      <p style="margin: 0;"><strong>MED DROP</strong></p>
      <p style="margin: 5px 0;">Medical Courier Services</p>
      <p style="margin: 5px 0;">Professional. Reliable. Trusted.</p>
      <p style="margin: 15px 0 0 0; font-size: 12px;">This is an automated email. Please do not reply to this email.</p>
      <p style="margin: 5px 0; font-size: 12px;">If you have questions, contact support@meddrop.com</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  await sendEmail({ to, subject, text, html })
}

// Re-export sendEmail from email-service for backward compatibility
export { sendEmail } from './email-service'
