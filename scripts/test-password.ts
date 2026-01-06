/**
 * Test password hashing and verification
 */

import { hashPassword, verifyPassword } from '../lib/auth'

async function main() {
  const testPassword = 'shipper123'
  
  console.log('Testing password hashing and verification...')
  console.log('')
  console.log(`Test password: ${testPassword}`)
  console.log('')

  try {
    // Hash a new password
    const hash = await hashPassword(testPassword)
    console.log('✅ Password hashed successfully')
    console.log(`Hash: ${hash.substring(0, 20)}...`)
    console.log(`Hash length: ${hash.length}`)
    console.log('')

    // Verify the password
    const isValid = await verifyPassword(testPassword, hash)
    console.log(`Password verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`)
    console.log('')

    // Test with wrong password
    const isWrong = await verifyPassword('wrongpassword', hash)
    console.log(`Wrong password verification: ${isWrong ? '❌ (should be false)' : '✅ Correctly rejected'}`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()

