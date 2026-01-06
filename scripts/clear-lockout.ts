/**
 * Script to clear account lockout for a user
 * Run with: npx ts-node --compiler-options {"module":"CommonJS"} scripts/clear-lockout.ts <email> <driver|shipper|admin>
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const userType = process.argv[3] as 'driver' | 'shipper' | 'admin'

  if (!email || !userType) {
    console.error('ERROR: Email and user type are required')
    console.log('Usage: npx ts-node scripts/clear-lockout.ts <email> <driver|shipper|admin>')
    console.log('Example: npx ts-node scripts/clear-lockout.ts shipper@test.com shipper')
    process.exit(1)
  }

  if (!['driver', 'shipper', 'admin'].includes(userType)) {
    console.error('ERROR: User type must be driver, shipper, or admin')
    process.exit(1)
  }

  console.log('Clearing account lockout...')
  console.log(`Email: ${email}`)
  console.log(`User Type: ${userType}`)
  console.log('')

  try {
    // Delete all login attempts for this email/userType
    const result = await prisma.loginAttempt.deleteMany({
      where: {
        email: email.toLowerCase(),
        userType,
      },
    })

    console.log(`SUCCESS: Deleted ${result.count} login attempt record(s)`)
    console.log('Account lockout cleared!')
    console.log('')
    console.log('You can now try logging in again.')
  } catch (error) {
    console.error('ERROR: Error clearing lockout:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

