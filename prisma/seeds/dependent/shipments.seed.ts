import { TrackingStatus } from 'src/generated/prisma/client';
import { prisma } from '../../client';

export async function seedShipments() {
  const forwarder = await prisma.forwarder.findUnique({
    where: { company_name: 'LBC Express' },
  });
  const transaction = await prisma.transaction.findUnique({
    where: { invoice_number: 'INV-2026-0002' },
  });

  if (!forwarder || !transaction) {
    throw new Error(
      'Prerequisite data missing for Shipments seed (Forwarder or Wholesale Transaction).',
    );
  }

  await prisma.shipment.create({
    data: {
      transactionId: transaction.id,
      forwarderId: forwarder.id,
      tracking_number: 'LBC-109283749-PH',
      dispatch_date: new Date('2026-03-12T14:00:00Z'),
      tracking_status: TrackingStatus.DISPATCHED,
      notes: 'Heavy hardware items - handle with care.',
    },
  });

  console.log('Seed: Dependent - Shipments seeded.');
}
