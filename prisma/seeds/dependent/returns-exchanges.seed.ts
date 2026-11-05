import { prisma } from '../../client';

export async function seedReturnsAndExchanges() {
  const staff = await prisma.staffUser.findFirst();

  // 1. Try finding specific transactions, or fallback to first available transactions
  let tx1 = await prisma.transaction.findUnique({
    where: { invoice_number: 'INV-2026-0001' },
  });
  let tx3 = await prisma.transaction.findUnique({
    where: { invoice_number: 'INV-2026-0003' },
  });

  if (!tx1) {
    tx1 = await prisma.transaction.findFirst({
      where: { transaction_type: 'RETAIL' },
    });
  }

  if (!tx3) {
    tx3 = await prisma.transaction.findFirst({
      where: {
        id: { not: tx1?.id },
      },
    });
  }

  const bolt = await prisma.product.findUnique({
    where: { sku: 'BLT-M8-30-SS' },
  });
  const drill = await prisma.product.findUnique({
    where: { sku: 'DRL-HSS-08' },
  });

  // Diagnostic check to pinpoint missing entity if missing
  const missing: string[] = [];
  if (!staff) missing.push('StaffUser');
  if (!tx1) missing.push('Transaction (INV-2026-0001 / Retail Tx)');
  if (!tx3) missing.push('Transaction (INV-2026-0003 / Secondary Tx)');
  if (!bolt) missing.push('Product (BLT-M8-30-SS)');
  if (!drill) missing.push('Product (DRL-HSS-08)');

  if (missing.length > 0) {
    throw new Error(
      `Prerequisite data missing for Returns/Exchanges seed: ${missing.join(', ')}`,
    );
  }

  // Guaranteed non-null assertion past guard
  const validTx1 = tx1!;
  const validTx3 = tx3!;
  const validBolt = bolt!;
  const validDrill = drill!;
  const validStaff = staff!;

  // 2. Seed Return (Idempotent check)
  const existingReturn = await prisma.return.findFirst({
    where: {
      transactionId: validTx1.id,
      productId: validBolt.id,
    },
  });

  if (!existingReturn) {
    await prisma.return.create({
      data: {
        transactionId: validTx1.id,
        productId: validBolt.id,
        quantity: 1,
        defect_reason: 'Stripped threads upon opening box',
        refund_amount: 10.0,
        staffId: validStaff.id,
        date: new Date('2026-03-11T10:00:00Z'),
      },
    });
  }

  // 3. Seed Exchange (Idempotent check)
  const existingExchange = await prisma.exchange.findFirst({
    where: {
      transactionId: validTx3.id,
      productId: validDrill.id,
    },
  });

  if (!existingExchange) {
    await prisma.exchange.create({
      data: {
        transactionId: validTx3.id,
        productId: validDrill.id,
        quantity: 1,
        price_difference: 0.0,
        is_within_7_days: true,
        date: new Date('2026-03-16T11:20:00Z'),
      },
    });
  }

  console.log('Seed: Dependent - Returns & Exchanges seeded.');
}
