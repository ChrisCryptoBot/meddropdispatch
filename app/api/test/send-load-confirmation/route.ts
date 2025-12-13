import { NextRequest, NextResponse } from 'next/server'
import { sendLoadConfirmationEmail } from '@/lib/email'

/**
 * POST /api/test/send-load-confirmation
 * Test endpoint to send a sample load confirmation email
 */
export async function POST(request: NextRequest) {
  try {
    let body: any = {}
    try {
      body = await request.json()
    } catch (e) {
      // If JSON parsing fails, try to get email from query params or use default
      const url = new URL(request.url)
      const emailParam = url.searchParams.get('email')
      if (emailParam) {
        body = { email: emailParam }
      }
    }
    const testEmail = body.email || process.env.TEST_EMAIL || 'MedDrop.Dispatch@outlook.com'
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Send test load confirmation email with sample data
    await sendLoadConfirmationEmail({
      to: testEmail,
      companyName: 'Test Medical Clinic',
      trackingCode: 'MED-TEST-001',
      loadDetails: {
        pickupFacility: {
          name: 'Test Pickup Facility',
          addressLine1: '123 Main Street',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
        },
        dropoffFacility: {
          name: 'Test Delivery Facility',
          addressLine1: '456 Oak Avenue',
          city: 'Boston',
          state: 'MA',
          postalCode: '02101',
        },
        serviceType: 'STAT',
        commodityDescription: 'Test medical specimens for laboratory analysis',
        readyTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        deliveryDeadline: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
        driverName: 'John Smith',
      },
      driverInfo: {
        name: 'John Smith',
        phone: '(555) 123-4567',
        email: 'driver@meddrop.com',
        vehicle: {
          type: 'VAN',
          make: 'Ford',
          model: 'Transit',
          plate: 'ABC-1234',
          nickname: 'Van #1',
        },
      },
      gpsTrackingEnabled: true, // Test with GPS enabled
      rateInfo: {
        quoteAmount: 125.50,
      },
      baseUrl,
    })

    return NextResponse.json({
      success: true,
      message: `Test load confirmation email sent to ${testEmail}`,
    })
  } catch (error: any) {
    console.error('Error sending test email:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        message: error.message || 'Unknown error',
        details: error.stack || error.toString(),
      },
      { status: 500 }
    )
  }
}

