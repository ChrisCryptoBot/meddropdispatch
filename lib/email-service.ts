// Email Service Implementation
// Uses Resend (already in package.json dependencies)

import { Resend } from 'resend'

// Lazy-initialize Resend client only when needed
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export interface EmailOptions {
  to: string
  subject: string
  text: string
  html: string
}

/**
 * Send an email using Resend
 * Falls back to console logging if Resend is not configured
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, text, html } = options

  const client = getResendClient()

  // If Resend API key is not configured, log to console (for development)
  if (!client) {
    console.log('⚠️  [Email Service] Resend API key not configured. Email would be sent:')
    console.log('   To:', to)
    console.log('   Subject:', subject)
    console.log('   Text Preview:', text.substring(0, 200) + '...')
    console.log('   ⚠️  To actually send emails, set RESEND_API_KEY in your .env file')
    return
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@meddrop.com'
    const fromName = process.env.RESEND_FROM_NAME || 'MED DROP'

    const result = await client.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      text,
      html,
    })

    console.log('📧 [Email Service] Email sent successfully:', {
      id: result.id,
      to,
      subject,
    })
  } catch (error) {
    console.error('📧 [Email Service] Failed to send email:', error)
    // Don't throw - allow application to continue even if email fails
    // Email failures shouldn't break the workflow
  }
}

