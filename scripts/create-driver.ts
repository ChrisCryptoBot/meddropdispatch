/**
 * Script to create a driver account
 * Run with: npx ts-node --compiler-options {"module":"CommonJS"} scripts/create-driver.ts
 * 
 * Usage:
 *   npm run create:driver
 *   npm run create:driver driver@meddrop.com driver123 John Doe
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'driver@meddrop.com'
  const password = process.argv[3] || 'driver123'
  const firstName = process.argv[4] || 'John'
  const lastName = process.argv[5] || 'Doe'
  const phone = process.argv[6] || '555-0100'

  console.log('Creating driver account...')
  console.log(`Email: ${email}`)
  console.log(`Name: ${firstName} ${lastName}`)
  console.log(`Phone: ${phone}`)
  console.log(`Password: ${password}`)
  console.log('')

  try {
    // Check if driver already exists
    const existing = await prisma.driver.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      console.log('WARNING: Driver already exists. Updating password and info...')
      await prisma.driver.update({
        where: { email: email.toLowerCase() },
        data: {
          passwordHash: await hashPassword(password),
          firstName,
          lastName,
          phone,
          status: 'AVAILABLE',
          vehicleType: 'VAN',
          hasRefrigeration: false,
          vehiclePlate: 'ABC-1234',
        },
      })
      console.log('SUCCESS: Driver account updated successfully!')
    } else {
      await prisma.driver.create({
        data: {
          email: email.toLowerCase(),
          firstName,
          lastName,
          phone,
          passwordHash: await hashPassword(password),
          status: 'AVAILABLE',
          vehicleType: 'VAN',
          hasRefrigeration: false,
          vehiclePlate: 'ABC-1234',
        },
      })
      console.log('SUCCESS: Driver account created successfully!')
    }

    console.log('')
    console.log('You can now login with:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   URL: http://localhost:3000/driver/login`)
  } catch (error) {
    console.error('ERROR: Error creating driver:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

