// Test email sending script
const testEmails = [
  { email: 'cm145571@gmail.com', type: 'driver' },
  { email: 'superior.one.logistics@gmail.com', type: 'shipper' },
]

async function sendTestEmail(email, type) {
  try {
    const url = `http://localhost:3000/api/debug/test-email?email=${encodeURIComponent(email)}&type=${type}`
    console.log(`\n📧 Sending ${type} welcome email to ${email}...`)
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ SUCCESS: ${data.message}`)
      console.log(`   Environment check:`, data.env)
    } else {
      console.log(`❌ ERROR: ${data.error}`)
      console.log(`   Message: ${data.message}`)
      if (data.stack) {
        console.log(`   Stack: ${data.stack}`)
      }
    }
  } catch (error) {
    console.error(`❌ FAILED to send to ${email}:`, error.message)
  }
}

async function sendAll() {
  console.log('🚀 Starting test email sending...\n')
  console.log('Make sure your dev server is running on http://localhost:3000\n')
  
  for (const test of testEmails) {
    await sendTestEmail(test.email, test.type)
    // Wait 2 seconds between emails
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  console.log('\n✅ Test email sending complete!')
  console.log('📬 Check your inboxes (and spam folders)')
  console.log('📊 Check Resend dashboard for delivery status')
}

sendAll().catch(console.error)

