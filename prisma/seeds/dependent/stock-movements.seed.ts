import { MovementType, UnitOfMeasure } from 'src/generated/prisma/client';
import { prisma } from '../../client';

export async function seedStockMovements() {
  // 1. Fetch prerequisite staff users
  const stockClerk = await prisma.staffUser.findFirst({
    where: { assigned_role: 'STOCK_MANAGEMENT' },
  });
  const manager = await prisma.staffUser.findFirst({
    where: { assigned_role: 'MANAGER' },
  });
  const fallbackStaff = await prisma.staffUser.findFirst();

  const staffId = stockClerk?.id || fallbackStaff?.id;
  const adminId = manager?.id || fallbackStaff?.id;

  // 2. Fetch prerequisite products
  const bolt = await prisma.product.findUnique({
    where: { sku: 'BLT-M8-30-SS' },
  });
  const nut = await prisma.product.findUnique({
    where: { sku: 'NUT-M8-SS' },
  });
  const drill = await prisma.product.findUnique({
    where: { sku: 'DRL-HSS-08' },
  });

  if (!staffId || !bolt || !nut || !drill) {
    throw new Error(
      'Prerequisite data missing for Stock Movements seed (Staff or Products).',
    );
  }

  // 3. Define initial stock movement audit logs
  const movements = [
    {
      productId: bolt.id,
      staffId: staffId,
      approvedById: null,
      date: new Date('2026-03-04T14:05:00Z'),
      type: MovementType.IN,
      current_uom: UnitOfMeasure.BOX,
      quantity_changed: 500.0, // 5 Boxes x 100 PCS
      previous_quantity: 0.0,
      new_quantity: 500.0,
      isOverride: false,
      reason: 'PO Receiving Intake - Purchase Order #1',
    },
    {
      productId: nut.id,
      staffId: staffId,
      approvedById: null,
      date: new Date('2026-03-04T14:10:00Z'),
      type: MovementType.IN,
      current_uom: UnitOfMeasure.BOX,
      quantity_changed: 1000.0, // 4 Boxes x 250 PCS
      previous_quantity: 0.0,
      new_quantity: 1000.0,
      isOverride: false,
      reason: 'PO Receiving Intake - Purchase Order #1',
    },
    {
      productId: bolt.id,
      staffId: staffId,
      approvedById: null,
      date: new Date('2026-03-10T09:15:00Z'),
      type: MovementType.SALE,
      current_uom: UnitOfMeasure.PCS,
      quantity_changed: -5.0,
      previous_quantity: 500.0,
      new_quantity: 495.0,
      isOverride: false,
      reason: 'POS Sale - Invoice #INV-2026-0001',
    },
    {
      productId: nut.id,
      staffId: staffId,
      approvedById: null,
      date: new Date('2026-03-10T09:15:00Z'),
      type: MovementType.SALE,
      current_uom: UnitOfMeasure.PCS,
      quantity_changed: -5.0,
      previous_quantity: 1000.0,
      new_quantity: 995.0,
      isOverride: false,
      reason: 'POS Sale - Invoice #INV-2026-0001',
    },
    {
      productId: bolt.id,
      staffId: staffId,
      approvedById: null,
      date: new Date('2026-03-11T10:00:00Z'),
      type: MovementType.RETURN,
      current_uom: UnitOfMeasure.PCS,
      quantity_changed: 1.0,
      previous_quantity: 495.0,
      new_quantity: 496.0,
      isOverride: false,
      reason: 'Customer Return - Restocked defective items after inspection',
    },
    {
      productId: drill.id,
      staffId: staffId,
      approvedById: adminId,
      date: new Date('2026-03-14T16:45:00Z'),
      type: MovementType.OUT,
      current_uom: UnitOfMeasure.PCS,
      quantity_changed: -2.0,
      previous_quantity: 47.0,
      new_quantity: 45.0,
      isOverride: true,
      reason: 'OVERRIDE_OUT_OF_STOCK: Internal store usage for shelf repair',
    },
  ];

  for (const movement of movements) {
    await prisma.stockMovement.create({
      data: movement,
    });
  }

  console.log('Seed: Dependent - Stock Movements seeded.');
}
