import { prisma } from '../../client';

export async function seedReturnsAndExchanges() {
  const staff = await prisma.staffUser.findFirst();
  const tx1 = await prisma.transaction.findUnique({
    where: { invoice_number: 'INV-2026-0001' },
  });
  const tx3 = await prisma.transaction.findUnique({
    where: { invoice_number: 'INV-2026-0003' },
  });

  const bolt = await prisma.product.findUnique({
    where: { sku: 'BLT-M8-30-SS' },
  });
  const drill = await prisma.product.findUnique({
    where: { sku: 'DRL-HSS-08' },
  });

  if (!staff || !tx1 || !tx3 || !bolt || !drill) {
    throw new Error(
      'Prerequisite data missing for Returns/Exchanges seed (Staff, Transactions, or Products).',
    );
  }

  // Return: 1 defective Hex Bolt from INV-2026-0001
  await prisma.return.create({
    data: {
      transactionId: tx1.id,
      productId: bolt.id,
      quantity: 1,
      defect_reason: 'Stripped threads upon opening box',
      refund_amount: 10.0,
      staffId: staff.id,
      date: new Date('2026-03-11T10:00:00Z'),
    },
  });

  // Exchange: 1 Drill bit replaced from INV-2026-0003
  await prisma.exchange.create({
    data: {
      transactionId: tx3.id,
      productId: drill.id,
      quantity: 1,
      price_difference: 0.0,
      is_within_7_days: true,
      date: new Date('2026-03-16T11:20:00Z'),
    },
  });

  console.log('Seed: Dependent - Returns & Exchanges seeded.');
}
