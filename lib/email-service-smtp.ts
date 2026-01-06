// Generic SMTP Email Service - Works with Gmail, Outlook, or any SMTP server
// No API keys needed - just email credentials
// Good for small scale deployments

import nodemailer from 'nodemailer'

let smtpTransporter: nodemailer.Transporter | null = null

function getSMTPTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  
  if (!host || !port || !user || !pass) {
    return null
  }
  
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: port === '465', // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
      // For Gmail, you may need to use an "App Password" instead of regular password
      // Enable 2FA and generate app password: https://myaccount.google.com/apppasswords
    })
  }
  
  return smtpTransporter
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
 * Send email via SMTP (Gmail, Outlook, or custom SMTP server)
 * 
 * For Gmail setup:
 * 1. Enable 2-Factor Authentication
 * 2. Generate App Password: https://myaccount.google.com/apppasswords
 * 3. Set env vars:
 *    SMTP_HOST=smtp.gmail.com
 *    SMTP_PORT=587
 *    SMTP_USER=your-email@gmail.com
 *    SMTP_PASS=your-app-password
 * 
 * For Outlook setup:
 *    SMTP_HOST=smtp-mail.outlook.com
 *    SMTP_PORT=587
 *    SMTP_USER=your-email@outlook.com
 *    SMTP_PASS=your-password
 */
export async function sendEmailSMTP(options: EmailOptions): Promise<void> {
  const transporter = getSMTPTransporter()
  
  if (!transporter) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env')
  }
  
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@meddrop.com'
  const fromName = process.env.SMTP_FROM_NAME || 'MED DROP'
  
  console.log('📧 [SMTP] Sending email:', {
    from: `${fromName} <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    host: process.env.SMTP_HOST,
  })
  
  try {
    const mailOptions: nodemailer.SendMailOptions = {
      from: `${fromName} <${fromEmail}>`,
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
    
    console.log('📧 [SMTP] Email sent successfully:', {
      messageId: result.messageId,
      to: options.to,
      subject: options.subject,
    })
  } catch (error) {
    console.error('📧 [SMTP] Failed to send email:', error)
    throw error
  }
}










