/**
 * Script to set admin status for a driver
 * Run with: npx ts-node --compiler-options {"module":"CommonJS"} scripts/set-driver-admin.ts <driver-email> <true|false>
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const isAdmin = process.argv[3] === 'true'

  if (!email) {
    console.error('ERROR: Driver email is required')
    console.log('Usage: npx ts-node scripts/set-driver-admin.ts <driver-email> <true|false>')
    process.exit(1)
  }

  console.log('Setting admin status for driver...')
  console.log(`Email: ${email}`)
  console.log(`Admin Status: ${isAdmin}`)
  console.log('')

  try {
    const driver = await prisma.driver.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!driver) {
      console.error(`ERROR: Driver with email ${email} not found`)
      process.exit(1)
    }

    await prisma.driver.update({
      where: { email: email.toLowerCase() },
      data: { isAdmin },
    })

    console.log('SUCCESS: Driver admin status updated successfully!')
    console.log('')
    console.log(`Driver: ${driver.firstName} ${driver.lastName}`)
    console.log(`Email: ${driver.email}`)
    console.log(`Admin Status: ${isAdmin ? 'ENABLED' : 'DISABLED'}`)
  } catch (error) {
    console.error('ERROR: Error updating driver admin status:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

