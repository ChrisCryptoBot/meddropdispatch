/**
 * Script to check which drivers have admin privileges
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking drivers with admin privileges...\n')

  try {
    const adminDrivers = await prisma.driver.findMany({
      where: { isAdmin: true },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
      },
    })

    if (adminDrivers.length === 0) {
      console.log('No drivers have admin privileges.')
    } else {
      console.log(`Found ${adminDrivers.length} driver(s) with admin privileges:\n`)
      adminDrivers.forEach((driver, index) => {
        console.log(`${index + 1}. ${driver.firstName} ${driver.lastName}`)
        console.log(`   Email: ${driver.email}`)
        console.log(`   Admin: ${driver.isAdmin}\n`)
      })
    }
  } catch (error) {
    console.error('Error checking admin drivers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

