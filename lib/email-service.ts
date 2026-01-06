// Email Service Implementation
// Uses SendGrid (primary) or SMTP (fallback)
// No Resend dependency - removed for simplicity

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
 * Send an email using SendGrid (primary) or SMTP (fallback)
 * Falls back to console logging if no email service is configured
 * Also creates notifications for all drivers if email is sent to company email
 */
export async function sendEmail(options: EmailOptions, throwOnError: boolean = false): Promise<void> {
  const { to, subject, text, html, attachments } = options

  // Check if email is being sent to company email (potential lead)
  const companyEmail = process.env.COMPANY_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'support@meddrop.com'
  const isCompanyEmail = to.toLowerCase().includes(companyEmail.toLowerCase()) || 
                         to.toLowerCase().includes('support@meddrop.com') ||
                         to.toLowerCase().includes('info@meddrop.com') ||
                         to.toLowerCase().includes('contact@meddrop.com')

  // Try email providers in order of preference
  // Priority: SendGrid > SMTP > Mailtrap > Console Log
  
  // 1. SendGrid (primary - easiest, no domain verification needed)
  if (process.env.SENDGRID_API_KEY) {
    try {
      const { sendEmailSendGrid } = await import('./email-service-sendgrid')
      await sendEmailSendGrid({ to, subject, text, html, attachments })
      
      // If email was sent to company email, notify all drivers (potential lead)
      if (isCompanyEmail) {
        try {
          const { notifyAllDriversCompanyEmailReceived } = await import('./notifications')
          await notifyAllDriversCompanyEmailReceived({
            fromEmail: to,
            subject,
            message: text.substring(0, 500),
          }).catch((notifError) => {
            console.error('📧 [Email Service] Failed to create driver notifications:', notifError)
          })
        } catch (notifError) {
          console.error('📧 [Email Service] Error importing notification function:', notifError)
        }
      }
      
      return
    } catch (error) {
      console.error('📧 [Email Service] SendGrid failed, trying next provider:', error)
      // Fall through to next provider
    }
  }

  // 2. SMTP (Gmail, Outlook, or custom SMTP)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const { sendEmailSMTP } = await import('./email-service-smtp')
      await sendEmailSMTP({ to, subject, text, html, attachments })
      
      // If email was sent to company email, notify all drivers (potential lead)
      if (isCompanyEmail) {
        try {
          const { notifyAllDriversCompanyEmailReceived } = await import('./notifications')
          await notifyAllDriversCompanyEmailReceived({
            fromEmail: to,
            subject,
            message: text.substring(0, 500),
          }).catch((notifError) => {
            console.error('📧 [Email Service] Failed to create driver notifications:', notifError)
          })
        } catch (notifError) {
          console.error('📧 [Email Service] Error importing notification function:', notifError)
        }
      }
      
      return
    } catch (error) {
      console.error('📧 [Email Service] SMTP failed, trying next provider:', error)
      // Fall through to next provider
    }
  }

  // 3. Mailtrap (for testing)
  if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
    try {
      const { sendEmailMailtrap } = await import('./email-service-mailtrap')
      await sendEmailMailtrap({ to, subject, text, html, attachments })
      return
    } catch (error) {
      console.error('📧 [Email Service] Mailtrap failed, falling back to console:', error)
      // Fall through to console logging
    }
  }

  // No email service configured - log to console
  const errorMsg = 'No email service configured'
  console.log('⚠️  [Email Service]', errorMsg)
  console.log('   To:', to)
  console.log('   Subject:', subject)
  console.log('   Text Preview:', text.substring(0, 200) + '...')
  console.log('   Attachments:', attachments?.length || 0)
  console.log('   ⚠️  To actually send emails, configure ONE of these:')
  console.log('      Option 1 (RECOMMENDED): Set SENDGRID_API_KEY in .env')
  console.log('         → Get free API key: https://app.sendgrid.com/settings/api_keys')
  console.log('         → Free tier: 100 emails/day forever')
  console.log('         → No domain verification needed!')
  console.log('      Option 2: Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS')
  console.log('         → Works with Gmail (use App Password) or Outlook')
  console.log('      Option 3: Set MAILTRAP_USER and MAILTRAP_PASS (testing only)')
  
  if (throwOnError) {
    throw new Error(errorMsg)
  }
}
