import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@meddrop.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@meddrop.com',
      passwordHash: await hashPassword('admin123'), // Change this in production!
      role: 'ADMIN',
    },
  })
  console.log('✅ Created admin user:', adminUser.email)

  // Create a sample shipper
  const shipper = await prisma.shipper.create({
    data: {
      companyName: 'ABC Medical Center',
      clientType: 'CLINIC',
      contactName: 'Dr. Jane Smith',
      phone: '(555) 123-4567',
      email: 'contact@abcmedical.com',
    },
  })
  console.log('✅ Created sample shipper:', shipper.companyName)

  // Create sample facilities
  const pickupFacility = await prisma.facility.create({
    data: {
      shipperId: shipper.id,
      name: 'ABC Medical Center - Main Campus',
      facilityType: 'CLINIC',
      addressLine1: '123 Medical Drive',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      contactName: 'Dr. Jane Smith',
      contactPhone: '(555) 123-4567',
      defaultAccessNotes: 'Use main entrance, check in at front desk',
    },
  })
  console.log('✅ Created pickup facility:', pickupFacility.name)

  const dropoffFacility = await prisma.facility.create({
    data: {
      shipperId: shipper.id,
      name: 'Quest Diagnostics Lab',
      facilityType: 'LAB',
      addressLine1: '456 Lab Avenue',
      city: 'Santa Monica',
      state: 'CA',
      postalCode: '90401',
      contactName: 'Lab Manager',
      contactPhone: '(555) 987-6543',
      defaultAccessNotes: 'Deliver to receiving department on 2nd floor',
    },
  })
  console.log('✅ Created dropoff facility:', dropoffFacility.name)

  // Create a sample load request
  const loadRequest = await prisma.loadRequest.create({
    data: {
      publicTrackingCode: 'MED-0001-AB',
      shipperId: shipper.id,
      pickupFacilityId: pickupFacility.id,
      dropoffFacilityId: dropoffFacility.id,
      serviceType: 'STAT',
      commodityDescription: 'Laboratory blood specimens for testing',
      specimenCategory: 'UN3373_CATEGORY_B',
      temperatureRequirement: 'REFRIGERATED',
      estimatedContainers: 3,
      estimatedWeightKg: 2.5,
      preferredContactMethod: 'EMAIL',
      status: 'QUOTED',
      quoteAmount: 75.00,
      quoteCurrency: 'USD',
      quoteNotes: 'Standard STAT rate for 3 containers',
      createdVia: 'WEB_FORM',
    },
  })
  console.log('✅ Created sample load request:', loadRequest.publicTrackingCode)

  // Create tracking events
  await prisma.trackingEvent.createMany({
    data: [
      {
        loadRequestId: loadRequest.id,
        code: 'REQUEST_RECEIVED',
        label: 'Request Received',
        description: 'Your load request has been received and is being reviewed by our team.',
        locationText: 'Los Angeles, CA',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        loadRequestId: loadRequest.id,
        code: 'PRICE_QUOTED',
        label: 'Price Quoted: $75.00',
        description: 'Standard STAT rate for 3 containers',
        locationText: 'MED DROP Dispatch',
        createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
      },
    ],
  })
  console.log('✅ Created tracking events')

  console.log('🎉 Seeding completed!')
  console.log('\n📝 Test Credentials:')
  console.log('Email: admin@meddrop.com')
  console.log('Password: admin123')
  console.log('\n🔍 Test Tracking Code: MED-0001-AB')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
