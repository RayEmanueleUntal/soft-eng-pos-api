import { POStatus, UnitOfMeasure } from 'src/generated/prisma/client';
import { prisma } from '../../client';

export async function seedDeliveries() {
  const staff = await prisma.staffUser.findFirst({
    where: { assigned_role: 'STOCK_MANAGEMENT' },
  });
  const fallbackStaff = await prisma.staffUser.findFirst();
  const staffId = staff?.id || fallbackStaff?.id;

  // Find fulfilled Purchase Order to record intake delivery
  const fulfilledPo = await prisma.purchaseOrder.findFirst({
    where: { po_status: POStatus.FULFILLED },
    include: { poItems: true },
  });

  if (!staffId || !fulfilledPo) {
    throw new Error(
      'Prerequisite data missing for Deliveries seed (Staff or Fulfilled PO).',
    );
  }

  await prisma.delivery.create({
    data: {
      poId: fulfilledPo.id,
      staffId: staffId,
      delivery_date: new Date('2026-03-04T14:00:00Z'),
      deliveryItems: {
        create: fulfilledPo.poItems.map((item) => ({
          productId: item.productId,
          received_quantity: item.requested_quantity,
          received_uom: item.ordered_uom,
          uom_conversion_factor: item.uom_conversion_factor,
          actual_base_quantity: item.expected_base_quantity,
        })),
      },
    },
  });

  console.log('Seed: Dependent - Deliveries seeded.');
}
