import { TrackingStatus } from 'src/generated/prisma/client';
import { prisma } from '../../client';

export async function seedShipments() {
  // 1. Fetch forwarder (with fallback)
  let forwarder = await prisma.forwarder.findUnique({
    where: { company_name: 'LBC Express' },
  });
  if (!forwarder) {
    forwarder = await prisma.forwarder.findFirst({
      where: { is_active: true },
    });
  }

  // 2. Fetch wholesale transaction (with fallback)
  let transaction = await prisma.transaction.findUnique({
    where: { invoice_number: 'INV-2026-0002' },
  });
  if (!transaction) {
    transaction = await prisma.transaction.findFirst({
      where: { transaction_type: 'WHOLESALE' },
    });
  }
  if (!transaction) {
    transaction = await prisma.transaction.findFirst();
  }

  // 3. Diagnostic prerequisite guard
  const missing: string[] = [];
  if (!forwarder) missing.push('Forwarder');
  if (!transaction) missing.push('Transaction');

  if (missing.length > 0) {
    throw new Error(
      `Prerequisite data missing for Shipments seed: ${missing.join(', ')}`,
    );
  }

  // Guaranteed non-null assertion past guard
  const validForwarder = forwarder!;
  const validTransaction = transaction!;

  // 4. Idempotent check before creation
  const existingShipment = await prisma.shipment.findFirst({
    where: {
      transactionId: validTransaction.id,
      forwarderId: validForwarder.id,
    },
  });

  if (!existingShipment) {
    await prisma.shipment.create({
      data: {
        transactionId: validTransaction.id,
        forwarderId: validForwarder.id,
        tracking_number: 'LBC-109283749-PH',
        dispatch_date: new Date('2026-03-12T14:00:00Z'),
        tracking_status: TrackingStatus.DISPATCHED,
        notes: 'Heavy hardware items - handle with care.',
      },
    });
  }

  console.log('Seed: Dependent - Shipments seeded.');
}
