/**
 * Configuration Validation and Management
 * Ensures all required environment variables are set and valid
 */

interface Config {
  // Core
  databaseUrl: string
  nextAuthSecret: string
  nextAuthUrl: string
  nodeEnv: 'development' | 'production' | 'test'
  
  // Email
  emailProvider: 'resend' | 'sendgrid' | 'smtp' | 'mailtrap' | 'console'
  resendApiKey?: string
  sendgridApiKey?: string
  smtpConfig?: {
    host: string
    port: number
    user: string
    password: string
    secure: boolean
  }
  mailtrapUser?: string
  mailtrapPass?: string
  fromEmail: string
  fromName: string
  
  // External Services
  googleMapsApiKey?: string
  twilioAccountSid?: string
  twilioAuthToken?: string
  twilioPhoneNumber?: string
  blobReadWriteToken?: string
  sentryDsn?: string
  
  // Company Info
  companyName: string
  companyEmail: string
  companyAddress: string
  companyCity: string
  companyState: string
  companyZip: string
  companyEin: string
  supportEmail: string
  supportPhone: string
  adminEmail: string
  adminPhoneNumber?: string
  internalNotificationEmail: string
  
  // Features
  enableSmsNotifications: boolean
  enableGpsTracking: boolean
  enableBlobStorage: boolean
}

type ConfigValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
  config?: Config
}

/**
 * Detect which email provider is configured
 */
function detectEmailProvider(): 'resend' | 'sendgrid' | 'smtp' | 'mailtrap' | 'console' {
  if (process.env.RESEND_API_KEY) return 'resend'
  if (process.env.SENDGRID_API_KEY) return 'sendgrid'
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp'
  if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) return 'mailtrap'
  return 'console' // Fallback to console logging
}

/**
 * Validate and load configuration
 */
export function validateConfig(): ConfigValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required variables
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required')
  }

  if (!process.env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET is required')
  } else if (process.env.NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET
    warnings.push('NEXTAUTH_SECRET is using default value - change it for production')
  }

  if (!process.env.NEXTAUTH_URL) {
    errors.push('NEXTAUTH_URL is required')
  }

  // Node environment
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test'
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push(`Invalid NODE_ENV: ${nodeEnv}. Must be development, production, or test`)
  }

  // Email provider detection
  const emailProvider = detectEmailProvider()
  if (emailProvider === 'console' && nodeEnv === 'production') {
    warnings.push('No email provider configured - emails will be logged to console only')
  }

  // Validate email provider config
  if (emailProvider === 'resend' && !process.env.RESEND_FROM_EMAIL) {
    warnings.push('RESEND_FROM_EMAIL not set - using default')
  }

  if (emailProvider === 'smtp') {
    if (!process.env.SMTP_PORT) {
      warnings.push('SMTP_PORT not set - defaulting to 587')
    }
    if (process.env.SMTP_SECURE !== 'true' && process.env.SMTP_SECURE !== 'false') {
      warnings.push('SMTP_SECURE not set - defaulting to false (TLS)')
    }
  }

  // Production warnings
  if (nodeEnv === 'production') {
    if (!process.env.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not set - error tracking disabled')
    }
    if (process.env.DATABASE_URL?.startsWith('file:')) {
      errors.push('SQLite database not allowed in production - use PostgreSQL')
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.ENABLE_BLOB_STORAGE) {
      warnings.push('BLOB_READ_WRITE_TOKEN not set - documents will be stored as base64 in database')
    }
  }

  // Load configuration
  const config: Config = {
    // Core
    databaseUrl: process.env.DATABASE_URL!,
    nextAuthSecret: process.env.NEXTAUTH_SECRET!,
    nextAuthUrl: process.env.NEXTAUTH_URL!,
    nodeEnv,

    // Email
    emailProvider,
    resendApiKey: process.env.RESEND_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    smtpConfig: emailProvider === 'smtp' ? {
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER!,
      password: process.env.SMTP_PASS!,
      secure: process.env.SMTP_SECURE === 'true',
    } : undefined,
    mailtrapUser: process.env.MAILTRAP_USER,
    mailtrapPass: process.env.MAILTRAP_PASS,
    fromEmail: process.env.RESEND_FROM_EMAIL || 
               process.env.SENDGRID_FROM_EMAIL || 
               process.env.COMPANY_EMAIL || 
               'noreply@meddrop.com',
    fromName: process.env.RESEND_FROM_NAME || 'MED DROP',

    // External Services
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
    blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN,
    sentryDsn: process.env.SENTRY_DSN,

    // Company Info
    companyName: process.env.COMPANY_NAME || 'MED DROP',
    companyEmail: process.env.COMPANY_EMAIL || 'support@meddrop.com',
    companyAddress: process.env.COMPANY_ADDRESS || '123 Medical Courier Way',
    companyCity: process.env.COMPANY_CITY || 'City',
    companyState: process.env.COMPANY_STATE || 'ST',
    companyZip: process.env.COMPANY_ZIP || '12345',
    companyEin: process.env.COMPANY_EIN || '12-3456789',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@meddrop.com',
    supportPhone: process.env.SUPPORT_PHONE || '1-800-MED-DROP',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@meddrop.com',
    adminPhoneNumber: process.env.ADMIN_PHONE_NUMBER,
    internalNotificationEmail: process.env.INTERNAL_NOTIFICATION_EMAIL || 'dispatch@meddrop.com',

    // Features
    enableSmsNotifications: process.env.ENABLE_SMS_NOTIFICATIONS !== 'false',
    enableGpsTracking: process.env.ENABLE_GPS_TRACKING !== 'false',
    enableBlobStorage: process.env.ENABLE_BLOB_STORAGE === 'true' && !!process.env.BLOB_READ_WRITE_TOKEN,
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: errors.length === 0 ? config : undefined,
  }
}

/**
 * Get validated configuration (throws if invalid)
 */
export function getConfig(): Config {
  const validation = validateConfig()
  if (!validation.valid) {
    throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`)
  }
  return validation.config!
}

/**
 * Check if configuration is valid for current environment
 */
export function isConfigValid(): boolean {
  return validateConfig().valid
}

/**
 * Get configuration status for debugging
 */
export function getConfigStatus(): {
  valid: boolean
  errors: string[]
  warnings: string[]
  emailProvider: string
  databaseType: string
  nodeEnv: string
} {
  const validation = validateConfig()
  const emailProvider = detectEmailProvider()
  const databaseType = process.env.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL' : 
                       process.env.DATABASE_URL?.startsWith('file:') ? 'SQLite' : 'Unknown'
  
  return {
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    emailProvider,
    databaseType,
    nodeEnv: process.env.NODE_ENV || 'development',
  }
}

/**
 * Configuration Validation and Management
 * Ensures all required environment variables are set and valid
 */

interface Config {
  // Core
  databaseUrl: string
  nextAuthSecret: string
  nextAuthUrl: string
  nodeEnv: 'development' | 'production' | 'test'
  
  // Email
  emailProvider: 'resend' | 'sendgrid' | 'smtp' | 'mailtrap' | 'console'
  resendApiKey?: string
  sendgridApiKey?: string
  smtpConfig?: {
    host: string
    port: number
    user: string
    password: string
    secure: boolean
  }
  mailtrapUser?: string
  mailtrapPass?: string
  fromEmail: string
  fromName: string
  
  // External Services
  googleMapsApiKey?: string
  twilioAccountSid?: string
  twilioAuthToken?: string
  twilioPhoneNumber?: string
  blobReadWriteToken?: string
  sentryDsn?: string
  
  // Company Info
  companyName: string
  companyEmail: string
  companyAddress: string
  companyCity: string
  companyState: string
  companyZip: string
  companyEin: string
  supportEmail: string
  supportPhone: string
  adminEmail: string
  adminPhoneNumber?: string
  internalNotificationEmail: string
  
  // Features
  enableSmsNotifications: boolean
  enableGpsTracking: boolean
  enableBlobStorage: boolean
}




/**
 * Check if configuration is valid for current environment
 */
/**
 * Get configuration status for debugging
 */
