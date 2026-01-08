/**
 * Migration Script: Backfill shipperCode for existing shippers
 * 
 * This script ensures all existing shippers have a unique client ID (shipperCode).
 * Run this once to backfill missing codes for shippers created before client ID requirement.
 * 
 * Usage:
 *   npx tsx scripts/backfill-shipper-codes.ts
 * 
 * Or with Node:
 *   npx ts-node scripts/backfill-shipper-codes.ts
 */

import { PrismaClient } from '@prisma/client'
import { ensureShipperCode } from '../lib/shipper-code'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting shipper code backfill...\n')

  try {
    // Find all shippers without a shipperCode
    const shippersWithoutCode = await prisma.shipper.findMany({
      where: {
        OR: [
          { shipperCode: null },
          { shipperCode: '' }
        ]
      },
      select: {
        id: true,
        companyName: true,
        shipperCode: true,
        email: true,
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    const totalCount = shippersWithoutCode.length

    if (totalCount === 0) {
      console.log('✅ All shippers already have client IDs. No action needed.')
      return
    }

    console.log(`📋 Found ${totalCount} shipper(s) without client IDs.\n`)

    let successCount = 0
    let errorCount = 0
    const errors: Array<{ id: string; companyName: string; error: string }> = []

    // Process each shipper
    for (let i = 0; i < shippersWithoutCode.length; i++) {
      const shipper = shippersWithoutCode[i]
      const progress = `[${i + 1}/${totalCount}]`

      try {
        console.log(`${progress} Processing: ${shipper.companyName} (${shipper.email})...`)

        // Ensure shipper has a code (will generate and save if missing)
        const shipperCode = await ensureShipperCode(shipper.id)

        console.log(`  ✅ Generated Client ID: ${shipperCode}`)
        successCount++
      } catch (error: any) {
        console.error(`  ❌ Error: ${error.message || error}`)
        errorCount++
        errors.push({
          id: shipper.id,
          companyName: shipper.companyName,
          error: error.message || String(error)
        })
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Backfill Summary:')
    console.log('='.repeat(60))
    console.log(`✅ Successfully processed: ${successCount}/${totalCount}`)
    console.log(`❌ Errors: ${errorCount}/${totalCount}`)

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:')
      errors.forEach((err) => {
        console.log(`   - ${err.companyName} (ID: ${err.id}): ${err.error}`)
      })
      console.log('\n💡 You can run this script again to retry failed entries.')
    } else {
      console.log('\n🎉 All shippers now have client IDs!')
    }
  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main()
  .catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
