import { prisma } from './client';

// Base seeds...
import { seedAdmin } from './seeds/admin.seed';
import { seedStaffUsers } from './seeds/staff.seed';
import { seedCategories } from './seeds/categories.seed';
import { seedBinLocations } from './seeds/bin-locations.seed';
import { seedSuppliers } from './seeds/suppliers.seed';
import { seedForwarders } from './seeds/forwarders.seed';
import { seedCustomers } from './seeds/customers.seed';
import { seedProducts } from './seeds/products.seed';
import { seedProductsFromCsv } from './seeds/products-csv.seed';
import { seedSystemSettings } from './seeds/system-settings.seed';

// Dependent seeds...
import { seedPurchaseOrders } from './seeds/dependent/purchase-orders.seed';
import { seedDeliveries } from './seeds/dependent/deliveries.seed';
import { seedTransactions } from './seeds/dependent/transactions.seed';
import { seedReturnsAndExchanges } from './seeds/dependent/returns-exchanges.seed';
import { seedShipments } from './seeds/dependent/shipments.seed';
import { seedStockMovements } from './seeds/dependent/stock-movements.seed';
import { seedExpenses } from './seeds/dependent/expenses.seed';

async function main() {
  const useCsv =
    process.env.USE_CSV === 'true' || process.argv.includes('--csv');

  console.log(
    `🌱 Starting database seeding (${useCsv ? 'CSV PRODUCT MODE' : 'MOCK DATA MODE'})...`,
  );

  // 1. Base entities
  await seedAdmin();
  await seedStaffUsers();
  await seedCategories();
  await seedBinLocations();
  await seedSuppliers();
  await seedForwarders();
  await seedCustomers();
  await seedSystemSettings();

  // 2. Products (Switch based on mode)
  if (useCsv) {
    await seedProductsFromCsv();
  } else {
    await seedProducts();
  }

  // 3. Dependent entities
  // Note: Mock dependent seeds look up fake SKUs (e.g., BLT-M8-30-SS).
  // Run them only in mock mode, or adapt them if your CSV contains those SKUs.
  if (!useCsv) {
    await seedPurchaseOrders();
    await seedDeliveries();
    await seedTransactions();
    await seedReturnsAndExchanges();
    await seedShipments();
    await seedStockMovements();
  }

  // Expenses only depend on StaffUsers, so it works in both modes
  await seedExpenses();

  console.log('✅ Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seed Master error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
