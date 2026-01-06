import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Database seed script')
  console.log('Starting seed process...')

  // Create default admin user
  const adminEmail = 'admin@test.com'
  const adminPassword = 'admin123'
  const adminName = 'System Admin'

  console.log(`\n📧 Creating admin user: ${adminEmail}`)

  // Hash password
  const passwordHash = await hashPassword(adminPassword)

  // Upsert admin user (create if doesn't exist, update if exists)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash: passwordHash,
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: passwordHash,
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin user created/updated successfully!')
  console.log('\n📋 Admin Credentials:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`   Email:    ${adminEmail}`)
  console.log(`   Password: ${adminPassword}`)
  console.log(`   Role:     ${admin.role}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n🔐 Login URL: /admin/login')
  console.log('\n✅ Seed script completed successfully!')
}

main()
  .catch((e) => {
    console.error('ERROR: Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
