import { prisma } from './client';
import { seedAdmin } from './seeds/admin.seed';
import { seedStaffUsers } from './seeds/staff.seed';
import { seedCategories } from './seeds/categories.seed';
import { seedBinLocations } from './seeds/bin-locations.seed';
import { seedSuppliers } from './seeds/suppliers.seed';
import { seedForwarders } from './seeds/forwarders.seed';
import { seedCustomers } from './seeds/customers.seed';
import { seedProducts } from './seeds/products.seed';

async function main() {
  console.log('🌱 Starting database seeding...');

  // Independent entities
  await seedAdmin();
  await seedStaffUsers();
  await seedCategories();
  await seedBinLocations();
  await seedSuppliers();
  await seedForwarders();
  await seedCustomers();

  // Dependent entities (Requires Categories & Bins)
  await seedProducts();

  console.log('✅ Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Seed Master error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
