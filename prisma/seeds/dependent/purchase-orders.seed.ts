import { POStatus, UnitOfMeasure } from 'src/generated/prisma/client';
import { prisma } from '../../client';

export async function seedPurchaseOrders() {
  const staff = await prisma.staffUser.findFirst({
    where: { assigned_role: 'STOCK_MANAGEMENT' },
  });
  const fallbackStaff = await prisma.staffUser.findFirst();
  const staffId = staff?.id || fallbackStaff?.id;

  const apexSupplier = await prisma.supplier.findUnique({
    where: { name: 'Apex Fasteners Corp' },
  });
  const indSupplier = await prisma.supplier.findUnique({
    where: { name: 'Industrial Hardware Philippines' },
  });

  const bolt = await prisma.product.findUnique({
    where: { sku: 'BLT-M8-30-SS' },
  });
  const nut = await prisma.product.findUnique({ where: { sku: 'NUT-M8-SS' } });
  const drill = await prisma.product.findUnique({
    where: { sku: 'DRL-HSS-08' },
  });

  if (!staffId || !apexSupplier || !indSupplier || !bolt || !nut || !drill) {
    throw new Error(
      'Prerequisite data missing for Purchase Orders seed (Staff, Suppliers, or Products).',
    );
  }

  // PO 1: Fulfilled Order from Apex
  const po1 = await prisma.purchaseOrder.create({
    data: {
      supplierId: apexSupplier.id,
      staffId: staffId,
      po_status: POStatus.FULFILLED,
      order_date: new Date('2026-03-01T08:00:00Z'),
      poItems: {
        create: [
          {
            productId: bolt.id,
            requested_quantity: 5,
            ordered_uom: UnitOfMeasure.BOX,
            uom_conversion_factor: 100,
            expected_base_quantity: 500,
            unit_cost: 500.0,
          },
          {
            productId: nut.id,
            requested_quantity: 4,
            ordered_uom: UnitOfMeasure.BOX,
            uom_conversion_factor: 250,
            expected_base_quantity: 1000,
            unit_cost: 450.0,
          },
        ],
      },
    },
  });

  // PO 2: Pending Order from Industrial Hardware Philippines
  await prisma.purchaseOrder.create({
    data: {
      supplierId: indSupplier.id,
      staffId: staffId,
      po_status: POStatus.PENDING,
      order_date: new Date('2026-03-20T10:30:00Z'),
      poItems: {
        create: [
          {
            productId: drill.id,
            requested_quantity: 10,
            ordered_uom: UnitOfMeasure.SET,
            uom_conversion_factor: 5,
            expected_base_quantity: 50,
            unit_cost: 70.0,
          },
        ],
      },
    },
  });

  console.log('Seed: Dependent - Purchase Orders seeded.');
}
