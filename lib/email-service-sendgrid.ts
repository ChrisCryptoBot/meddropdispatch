// SendGrid Email Service - Easy Setup, No Domain Verification Required Initially
// Free tier: 100 emails/day forever
// Setup: Get API key from https://app.sendgrid.com/settings/api_keys

import sgMail from '@sendgrid/mail'

let sendgridInitialized = false

function initializeSendGrid(): boolean {
  const apiKey = process.env.SENDGRID_API_KEY
  
  if (!apiKey) {
    return false
  }
  
  if (!sendgridInitialized) {
    sgMail.setApiKey(apiKey)
    sendgridInitialized = true
    console.log('📧 [SendGrid] Initialized with API key:', apiKey.substring(0, 10) + '...')
  }
  
  return true
}

export interface EmailOptions {
  to: string
  subject: string
  text: string
  html: string
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType?: string
  }>
}

/**
 * Send email via SendGrid
 * No domain verification needed initially - can send from any email
 * For production, verify domain for better deliverability
 */
export async function sendEmailSendGrid(options: EmailOptions): Promise<void> {
  if (!initializeSendGrid()) {
    throw new Error('SendGrid API key not configured. Set SENDGRID_API_KEY in .env')
  }
  
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@meddrop.com'
  const fromName = process.env.SENDGRID_FROM_NAME || 'MED DROP'
  
  console.log('📧 [SendGrid] Sending email:', {
    from: `${fromName} <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
  })
  
  try {
    const msg: any = {
      to: options.to,
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: options.subject,
      text: options.text,
      html: options.html,
    }
    
    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      msg.attachments = options.attachments.map(att => ({
        content: typeof att.content === 'string' 
          ? Buffer.from(att.content).toString('base64')
          : att.content.toString('base64'),
        filename: att.filename,
        type: att.contentType || 'application/octet-stream',
        disposition: 'attachment',
      }))
    }
    
    const result = await sgMail.send(msg)
    
    console.log('📧 [SendGrid] Email sent successfully:', {
      statusCode: result[0]?.statusCode,
      headers: result[0]?.headers,
      to: options.to,
      subject: options.subject,
    })
  } catch (error: any) {
    console.error('📧 [SendGrid] Failed to send email:', error)
    if (error.response) {
      console.error('📧 [SendGrid] Error details:', {
        statusCode: error.response.statusCode,
        body: error.response.body,
        headers: error.response.headers,
      })
    }
    throw error
  }
}










