/**
 * Script to create the first admin user
 * Run with: npx ts-node --compiler-options {"module":"CommonJS"} scripts/create-admin.ts
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'admin@meddrop.com'
  const password = process.argv[3] || 'admin123'
  const name = process.argv[4] || 'Admin User'

  console.log('Creating admin user...')
  console.log(`Email: ${email}`)
  console.log(`Name: ${name}`)
  console.log(`Password: ${password}`)
  console.log('')

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      console.log('WARNING: User already exists. Updating password...')
      await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          passwordHash: await hashPassword(password),
          name,
          role: 'ADMIN',
        },
      })
      console.log('SUCCESS: Admin user updated successfully!')
    } else {
      await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          passwordHash: await hashPassword(password),
          role: 'ADMIN',
        },
      })
      console.log('SUCCESS: Admin user created successfully!')
    }

    console.log('')
    console.log('You can now login with:')
    console.log(`   Email: ${email}`)
    console.log(`   Password: ${password}`)
  } catch (error) {
    console.error('ERROR: Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

