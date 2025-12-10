// Email Notification Service
// TODO: Integrate with real email provider (Resend, SendGrid, AWS SES, etc.)

export interface EmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

/**
 * Send an email notification
 *
 * For now, this logs to console. Replace with actual email provider integration:
 * - Resend: https://resend.com/docs
 * - SendGrid: https://docs.sendgrid.com/
 * - AWS SES: https://docs.aws.amazon.com/ses/
 * - Postmark: https://postmarkapp.com/developer
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  console.log('📧 EMAIL NOTIFICATION:')
  console.log('To:', options.to)
  console.log('Subject:', options.subject)
  console.log('Text:', options.text)
  if (options.html) {
    console.log('HTML:', options.html.substring(0, 200) + '...')
  }
  console.log('---')

  // TODO: Implement real email sending
  // Example with Resend:
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'MED DROP <noreply@meddrop.com>',
  //   to: options.to,
  //   subject: options.subject,
  //   text: options.text,
  //   html: options.html,
  // });
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
