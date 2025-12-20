// Mailtrap Email Service - For Testing Without Domain Verification
// Mailtrap catches all emails in a test inbox - perfect for development

import nodemailer from 'nodemailer'

let mailtrapTransporter: nodemailer.Transporter | null = null

function getMailtrapTransporter(): nodemailer.Transporter | null {
  const user = process.env.MAILTRAP_USER
  const pass = process.env.MAILTRAP_PASS
  
  if (!user || !pass) {
    return null
  }
  
  if (!mailtrapTransporter) {
    mailtrapTransporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.MAILTRAP_PORT || '2525'),
      auth: {
        user,
        pass,
      },
    })
  }
  
  return mailtrapTransporter
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
 * Send email via Mailtrap (for testing)
 * All emails are caught in Mailtrap inbox - no real sending
 */
export async function sendEmailMailtrap(options: EmailOptions): Promise<void> {
  const transporter = getMailtrapTransporter()
  
  if (!transporter) {
    throw new Error('Mailtrap credentials not configured. Set MAILTRAP_USER and MAILTRAP_PASS in .env')
  }
  
  const fromEmail = process.env.MAILTRAP_FROM || 'MED DROP <noreply@meddrop.com>'
  
  console.log('📧 [Mailtrap] Sending email:', {
    from: fromEmail,
    to: options.to,
    subject: options.subject,
  })
  
  try {
    const mailOptions: nodemailer.SendMailOptions = {
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    }
    
    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      }))
    }
    
    const result = await transporter.sendMail(mailOptions)
    
    console.log('📧 [Mailtrap] Email sent successfully:', {
      messageId: result.messageId,
      to: options.to,
      subject: options.subject,
    })
    
    console.log('📧 [Mailtrap] View email in Mailtrap inbox: https://mailtrap.io/inboxes')
  } catch (error) {
    console.error('📧 [Mailtrap] Failed to send email:', error)
    throw error
  }
}





