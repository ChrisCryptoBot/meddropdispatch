import { NextRequest, NextResponse } from 'next/server'
import { sendDriverWelcomeEmail, sendShipperWelcomeEmail } from '@/lib/email'

/**
 * GET /api/debug/test-email
 * Test endpoint to verify email sending works
 * Development only - disabled in production
 */
export async function GET(request: NextRequest) {
  // Disable in production for security
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is not available in production' },
      { status: 403 }
    )
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const emailType = searchParams.get('type') || 'driver'
    const testEmail = searchParams.get('email') || 'test@example.com'

    console.log('🧪 [Test Email] Starting email test...')
    console.log('   Type:', emailType)
    console.log('   To:', testEmail)
    console.log('   RESEND_API_KEY set:', !!process.env.RESEND_API_KEY)
    console.log('   RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL)
    console.log('   RESEND_FROM_NAME:', process.env.RESEND_FROM_NAME)

    if (emailType === 'driver') {
      await sendDriverWelcomeEmail({
        to: testEmail,
        firstName: 'Test',
        lastName: 'Driver',
        email: testEmail,
      })
      console.log('SUCCESS: [Test Email] Driver welcome email sent successfully')
    } else if (emailType === 'shipper') {
      await sendShipperWelcomeEmail({
        to: testEmail,
        companyName: 'Test Company',
        contactName: 'Test Contact',
        email: testEmail,
      })
      console.log('SUCCESS: [Test Email] Shipper welcome email sent successfully')
    } else {
      return NextResponse.json(
        { error: 'Invalid email type. Use ?type=driver or ?type=shipper' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${emailType} welcome email sent to ${testEmail}`,
      env: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL,
        fromName: process.env.RESEND_FROM_NAME,
      },
    })
  } catch (error) {
    console.error('ERROR: [Test Email] Failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

