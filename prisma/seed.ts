import { prisma } from './seeds/client';
import { seedAdmin } from './seeds/admin.seed';

async function main() {
  console.log('🌱 Starting database seeding...');

  // Execute modular seed scripts
  await seedAdmin();

  console.log('✅ Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
