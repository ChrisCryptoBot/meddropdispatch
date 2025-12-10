/**
 * Script to check shipper account in database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'shipper@test.com'

  console.log(`Checking shipper account for: ${email}`)
  console.log('')

  try {
    const shipper = await prisma.shipper.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!shipper) {
      console.log('❌ Shipper not found!')
      return
    }

    console.log('✅ Shipper found!')
    console.log('')
    console.log('Details:')
    console.log(`  ID: ${shipper.id}`)
    console.log(`  Email: ${shipper.email}`)
    console.log(`  Company: ${shipper.companyName}`)
    console.log(`  Has Password Hash: ${shipper.passwordHash ? 'YES' : 'NO'}`)
    console.log(`  Password Hash Length: ${shipper.passwordHash?.length || 0}`)
    console.log(`  Is Active: ${shipper.isActive}`)
    console.log(`  Created: ${shipper.createdAt}`)
    console.log(`  Updated: ${shipper.updatedAt}`)

  } catch (error) {
    console.error('Error checking shipper:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

