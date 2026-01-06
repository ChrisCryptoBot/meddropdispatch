import { NextRequest, NextResponse } from 'next/server'
import { sendDriverWelcomeEmail } from '@/lib/email'
import { sendEmail } from '@/lib/email-service'

/**
 * POST /api/test/send-welcome-email
 * Test endpoint to manually send welcome email
 * Development only - disabled in production
 */
export async function POST(request: NextRequest) {
  // Disable in production for security
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is not available in production' },
      { status: 403 }
    )
  }

  try {
    const { email, firstName, lastName } = await request.json()

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, firstName, and lastName are required' },
        { status: 400 }
      )
    }

    console.log('[Test] Attempting to send welcome email to:', email)
    console.log('[Test] RESEND_API_KEY configured:', !!process.env.RESEND_API_KEY)
    console.log('[Test] RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL)

    // Send email and catch any errors - use throwOnError to see actual issues
    try {
      // First try the welcome email function
      await sendDriverWelcomeEmail({
        to: email,
        firstName,
        lastName,
        email,
      })
      
      // Also test direct sendEmail with throwOnError to catch any silent failures
      // This is just for debugging - the welcome email function should work
    } catch (emailError: any) {
      console.error('ERROR: [Test] Email sending error:', emailError)
      return NextResponse.json(
        {
          error: 'Email sending failed',
          message: emailError?.message || 'Unknown error',
          details: {
            name: emailError?.name,
            message: emailError?.message,
            statusCode: emailError?.statusCode,
            response: emailError?.response,
            stack: emailError?.stack,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent successfully',
      email,
    })
  } catch (error) {
    console.error('ERROR: [Test] Failed to send welcome email:', error)
    return NextResponse.json(
      {
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      },
      { status: 500 }
    )
  }
}


