// Email Service Implementation
// Uses Resend (already in package.json dependencies)

import { Resend } from 'resend'

// Lazy-initialize Resend client only when needed
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('⚠️  [Email Service] RESEND_API_KEY not found in environment')
    return null
  }
  if (!resendClient) {
    console.log('📧 [Email Service] Initializing Resend client with API key:', apiKey.substring(0, 10) + '...')
    resendClient = new Resend(apiKey)
  }
  return resendClient
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
 * Send an email using Resend
 * Falls back to console logging if Resend is not configured
 * Also creates notifications for all drivers if email is sent to company email
 */
export async function sendEmail(options: EmailOptions, throwOnError: boolean = false): Promise<void> {
  const { to, subject, text, html, attachments } = options

  // Check if email is being sent to company email (potential lead)
  const companyEmail = process.env.COMPANY_EMAIL || process.env.RESEND_FROM_EMAIL || 'support@meddrop.com'
  const isCompanyEmail = to.toLowerCase().includes(companyEmail.toLowerCase()) || 
                         to.toLowerCase().includes('support@meddrop.com') ||
                         to.toLowerCase().includes('info@meddrop.com') ||
                         to.toLowerCase().includes('contact@meddrop.com')

  const client = getResendClient()

  // If Resend API key is not configured, log to console (for development)
  if (!client) {
    const errorMsg = 'Resend API key not configured'
    console.log('⚠️  [Email Service]', errorMsg)
    console.log('   To:', to)
    console.log('   Subject:', subject)
    console.log('   Text Preview:', text.substring(0, 200) + '...')
    console.log('   Attachments:', attachments?.length || 0)
    console.log('   ⚠️  To actually send emails, set RESEND_API_KEY in your .env file')
    if (throwOnError) {
      throw new Error(errorMsg)
    }
    return
  }

  try {
    // Use Resend's test domain if no verified domain is available
    // For production, you must verify your domain in Resend dashboard
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const fromName = process.env.RESEND_FROM_NAME || 'MED DROP'

    console.log('📧 [Email Service] Sending email:', {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      hasApiKey: !!process.env.RESEND_API_KEY,
      hasAttachments: !!attachments?.length,
    })

    const emailData: any = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      text,
      html,
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      emailData.attachments = attachments
    }

    const result = await client.emails.send(emailData)

    // Resend API returns { data: { id }, error } structure
    if (result.error) {
      const errorMessage = result.error.message || JSON.stringify(result.error)
      const statusCode = result.error.statusCode || 'unknown'
      
      console.error('📧 [Email Service] Resend API error:', {
        statusCode,
        name: result.error.name,
        message: errorMessage,
        fullError: result.error,
      })
      
      // Check for specific test domain restriction
      if (errorMessage.includes('only send testing emails to your own email address')) {
        console.error('📧 [Email Service] ⚠️  TEST DOMAIN RESTRICTION:')
        console.error('   The test domain (onboarding@resend.dev) can only send to your verified email.')
        console.error('   To send to other recipients, verify a custom domain at: https://resend.com/domains')
        console.error('   Then update RESEND_FROM_EMAIL to use your verified domain.')
      }
      
      const error = new Error(`Resend API error (${statusCode}): ${errorMessage}`)
      if (throwOnError) {
        throw error
      }
      return
    }

    // Check if result has data property (newer API) or id directly (older API)
    const emailId = result.data?.id || (result as any).id

    if (!emailId) {
      console.error('📧 [Email Service] No email ID returned from Resend API')
      console.error('📧 [Email Service] Response structure:', Object.keys(result))
      if (throwOnError) {
        throw new Error('Resend API did not return an email ID')
      }
      return
    }

    console.log('📧 [Email Service] Email sent successfully:', {
      id: emailId,
      to,
      subject,
      hasAttachments: !!attachments?.length,
      responseKeys: Object.keys(result),
    })

    // If email was sent to company email, notify all drivers (potential lead)
    if (isCompanyEmail) {
      try {
        const { notifyAllDriversCompanyEmailReceived } = await import('./notifications')
        await notifyAllDriversCompanyEmailReceived({
          fromEmail: to, // The recipient (company email) - we'll extract sender from email headers if available
          subject,
          message: text.substring(0, 500), // First 500 chars of email content
        }).catch((notifError) => {
          console.error('📧 [Email Service] Failed to create driver notifications:', notifError)
          // Don't fail email send if notification creation fails
        })
      } catch (notifError) {
        console.error('📧 [Email Service] Error importing notification function:', notifError)
        // Don't fail email send if notification import fails
      }
    }
  } catch (error: any) {
    console.error('📧 [Email Service] Failed to send email:', error)
    console.error('📧 [Email Service] Error details:', {
      message: error?.message,
      name: error?.name,
      statusCode: error?.statusCode,
      response: error?.response,
    })
    // Re-throw if requested (for testing)
    if (throwOnError) {
      throw error
    }
    // Don't throw - allow application to continue even if email fails
    // Email failures shouldn't break the workflow
  }
}

