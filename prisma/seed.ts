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

  // Create or update sample drivers
  const driver1 = await prisma.driver.upsert({
    where: { email: 'john.doe@meddrop.com' },
    update: {},
    create: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@meddrop.com',
      phone: '(555) 234-5678',
      passwordHash: await hashPassword('driver123'),
      licenseNumber: 'D1234567',
      licenseExpiry: new Date('2026-12-31'),
      status: 'AVAILABLE',
      vehicleType: 'VAN',
      vehicleMake: 'Ford',
      vehicleModel: 'Transit',
      vehicleYear: 2022,
      vehiclePlate: 'ABC-1234',
      hasRefrigeration: true,
      un3373Certified: true,
      un3373ExpiryDate: new Date('2025-12-31'),
      hipaaTrainingDate: new Date('2024-01-15'),
      hiredDate: new Date('2023-06-01'),
    },
  })
  console.log('✅ Created/updated driver:', `${driver1.firstName} ${driver1.lastName}`)

  const driver2 = await prisma.driver.upsert({
    where: { email: 'sarah.johnson@meddrop.com' },
    update: {},
    create: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@meddrop.com',
      phone: '(555) 345-6789',
      passwordHash: await hashPassword('driver123'),
      licenseNumber: 'D7654321',
      licenseExpiry: new Date('2027-06-30'),
      status: 'ON_ROUTE',
      vehicleType: 'SPRINTER',
      vehicleMake: 'Mercedes-Benz',
      vehicleModel: 'Sprinter',
      vehicleYear: 2023,
      vehiclePlate: 'XYZ-9876',
      hasRefrigeration: true,
      un3373Certified: true,
      un3373ExpiryDate: new Date('2026-03-31'),
      hipaaTrainingDate: new Date('2024-02-20'),
      hiredDate: new Date('2023-08-15'),
    },
  })
  console.log('✅ Created/updated driver:', `${driver2.firstName} ${driver2.lastName}`)

  // Create or update a sample shipper
  const shipper = await prisma.shipper.upsert({
    where: { email: 'contact@abcmedical.com' },
    update: {
      passwordHash: await hashPassword('shipper123'), // Update shipper portal password
      isActive: true,
    },
    create: {
      companyName: 'ABC Medical Center',
      clientType: 'CLINIC',
      contactName: 'Dr. Jane Smith',
      phone: '(555) 123-4567',
      email: 'contact@abcmedical.com',
      passwordHash: await hashPassword('shipper123'), // Add shipper portal password
      isActive: true,
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

  // Create or update a sample load request with driver assignment
  const loadRequest = await prisma.loadRequest.upsert({
    where: { publicTrackingCode: 'MED-0001-AB' },
    update: {
      driverId: driver1.id, // Update driver assignment
      assignedAt: new Date(Date.now() - 1200000),
      acceptedByDriverAt: new Date(Date.now() - 600000),
      status: 'SCHEDULED',
    },
    create: {
      publicTrackingCode: 'MED-0001-AB',
      shipperId: shipper.id,
      pickupFacilityId: pickupFacility.id,
      dropoffFacilityId: dropoffFacility.id,
      driverId: driver1.id, // Assign to driver 1
      assignedAt: new Date(Date.now() - 1200000), // 20 minutes ago
      acceptedByDriverAt: new Date(Date.now() - 600000), // 10 minutes ago
      serviceType: 'STAT',
      commodityDescription: 'Laboratory blood specimens for testing',
      specimenCategory: 'UN3373_CATEGORY_B',
      temperatureRequirement: 'REFRIGERATED',
      estimatedContainers: 3,
      estimatedWeightKg: 2.5,
      preferredContactMethod: 'EMAIL',
      status: 'SCHEDULED',
      quoteAmount: 75.00,
      quoteCurrency: 'USD',
      quoteNotes: 'Standard STAT rate for 3 containers',
      quoteAcceptedAt: new Date(Date.now() - 1800000), // 30 minutes ago
      createdVia: 'WEB_FORM',
    },
  })
  console.log('✅ Created/updated sample load request:', loadRequest.publicTrackingCode)

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
  console.log('Admin: admin@meddrop.com / admin123')
  console.log('Driver 1: john.doe@meddrop.com / driver123')
  console.log('Driver 2: sarah.johnson@meddrop.com / driver123')
  console.log('Shipper: contact@abcmedical.com / shipper123')
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
