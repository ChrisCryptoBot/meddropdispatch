import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Database seed script')
  console.log('WARNING: No seed data configured. Add your initial data here if needed.')
  console.log('SUCCESS: Seed script completed (no data seeded)')
}

main()
  .catch((e) => {
    console.error('ERROR: Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
