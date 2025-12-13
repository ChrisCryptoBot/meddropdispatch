// Direct script to send test load confirmation email
require('dotenv').config({ path: '.env' })
const { sendLoadConfirmationEmail } = require('../lib/email')

async function sendTestEmail() {
  const testEmail = process.env.TEST_EMAIL || 'test@example.com'
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  console.log('📧 Sending test load confirmation email to:', testEmail)
  console.log('📧 Using Resend API Key:', process.env.RESEND_API_KEY ? 'Found ✓' : 'NOT FOUND ✗')

  try {
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

    console.log('✅ Test email sent successfully!')
    console.log('📬 Check your inbox at:', testEmail)
  } catch (error) {
    console.error('❌ Error sending test email:', error.message)
    console.error(error)
    process.exit(1)
  }
}

sendTestEmail()


