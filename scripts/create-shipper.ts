/**
 * Script to create a test shipper account
 * Run with: npx ts-node --compiler-options {"module":"CommonJS"} scripts/create-shipper.ts
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'shipper@test.com'
  const password = process.argv[3] || 'shipper123'
  const companyName = process.argv[4] || 'Test Medical Clinic'

  console.log('Creating shipper account...')
  console.log(`Email: ${email}`)
  console.log(`Company: ${companyName}`)
  console.log(`Password: ${password}`)
  console.log('')

  try {
    // Check if shipper already exists
    const existing = await prisma.shipper.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      console.log('WARNING: Shipper already exists. Updating password and info...')
      await prisma.shipper.update({
        where: { email: email.toLowerCase() },
        data: {
          passwordHash: await hashPassword(password),
          companyName,
          contactName: 'Test Contact',
          phone: '555-0123',
          clientType: 'CLINIC',
          isActive: true,
        },
      })
      console.log('SUCCESS: Shipper account updated successfully!')
    } else {
      await prisma.shipper.create({
        data: {
          email: email.toLowerCase(),
          companyName,
          contactName: 'Test Contact',
          phone: '555-0123',
          clientType: 'CLINIC',
          passwordHash: await hashPassword(password),
          isActive: true,
        },
      })
      console.log('SUCCESS: Shipper account created successfully!')
    }

    console.log('')
    console.log('You can now login with:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
    console.log(`   URL: http://localhost:3000/shipper/login`)
  } catch (error) {
    console.error('ERROR: Error creating shipper:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

