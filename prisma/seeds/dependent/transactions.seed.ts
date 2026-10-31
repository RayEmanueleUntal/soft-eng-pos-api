import {
  PaymentMethod,
  TransactionStatus,
  TransactionType,
  UnitOfMeasure,
} from 'src/generated/prisma/client';
import { prisma } from '../../client';

export async function seedTransactions() {
  const cashier = await prisma.staffUser.findFirst({
    where: { assigned_role: 'CASHIER' },
  });
  const fallbackStaff = await prisma.staffUser.findFirst();
  const staffId = cashier?.id || fallbackStaff?.id;

  const walkInCustomer = await prisma.customer.findFirst({
    where: { type: 'RETAIL' },
  });
  const wholesaleCustomer = await prisma.customer.findFirst({
    where: { type: 'WHOLESALE' },
  });

  const bolt = await prisma.product.findUnique({
    where: { sku: 'BLT-M8-30-SS' },
  });
  const nut = await prisma.product.findUnique({ where: { sku: 'NUT-M8-SS' } });
  const drill = await prisma.product.findUnique({
    where: { sku: 'DRL-HSS-08' },
  });

  if (!staffId || !bolt || !nut || !drill || !wholesaleCustomer) {
    throw new Error(
      'Prerequisite data missing for Transactions seed (Staff, Products, or Customers).',
    );
  }

  // Define transactions list to seed safely
  const transactionsToSeed = [
    {
      invoice_number: 'INV-TEST-2026-0001',
      date: new Date('2026-03-10T09:15:00Z'),
      status: TransactionStatus.COMPLETED,
      transaction_type: TransactionType.RETAIL,
      subtotal: 70.0,
      tax_total: 0.0,
      discount_total: 0.0,
      grand_total: 70.0,
      customerId: walkInCustomer?.id ?? null,
      staffId: staffId,
      items: [
        {
          productId: bolt.id,
          quantity_sold: 5,
          unit_of_measure: UnitOfMeasure.PCS,
          uom_conversion_factor: 1,
          base_quantity_deducted: 5,
          unit_price: 10.0,
          cost_price: 5.5,
          discount: 0.0,
          subtotal: 50.0,
        },
        {
          productId: nut.id,
          quantity_sold: 5,
          unit_of_measure: UnitOfMeasure.PCS,
          uom_conversion_factor: 1,
          base_quantity_deducted: 5,
          unit_price: 4.0,
          cost_price: 2.0,
          discount: 0.0,
          subtotal: 20.0,
        },
      ],
      payment: {
        amount_paid: 70.0,
        payment_method: PaymentMethod.CASH,
        cashPayment: { cash_tendered: 100.0, change_given: 30.0 },
      },
    },
    {
      invoice_number: 'INV-TEST-2026-0002',
      date: new Date('2026-03-12T11:00:00Z'),
      status: TransactionStatus.COMPLETED,
      transaction_type: TransactionType.WHOLESALE,
      subtotal: 800.0,
      tax_total: 0.0,
      discount_total: 0.0,
      grand_total: 800.0,
      customerId: wholesaleCustomer.id,
      staffId: staffId,
      items: [
        {
          productId: bolt.id,
          quantity_sold: 1,
          unit_of_measure: UnitOfMeasure.BOX,
          uom_conversion_factor: 100,
          base_quantity_deducted: 100,
          unit_price: 800.0,
          cost_price: 5.5,
          discount: 0.0,
          subtotal: 800.0,
        },
      ],
      payment: {
        amount_paid: 800.0,
        payment_method: PaymentMethod.CREDIT,
        creditPayment: {
          due_date: new Date('2026-04-12T11:00:00Z'),
          remaining_credit_balance: 800.0,
          status: 'UNPAID' as const,
        },
      },
    },
    {
      invoice_number: 'INV-TEST-2026-0003',
      date: new Date('2026-03-15T15:30:00Z'),
      status: TransactionStatus.COMPLETED,
      transaction_type: TransactionType.RETAIL,
      subtotal: 70.0,
      tax_total: 0.0,
      discount_total: 0.0,
      grand_total: 70.0,
      customerId: walkInCustomer?.id ?? null,
      staffId: staffId,
      items: [
        {
          productId: drill.id,
          quantity_sold: 2,
          unit_of_measure: UnitOfMeasure.PCS,
          uom_conversion_factor: 1,
          base_quantity_deducted: 2,
          unit_price: 35.0,
          cost_price: 15.0,
          discount: 0.0,
          subtotal: 70.0,
        },
      ],
      payment: {
        amount_paid: 70.0,
        payment_method: PaymentMethod.GCASH,
        gCashPayment: {
          reference_number: 'GC-992019482',
          gcash_mobile_number: '+639171112222',
        },
      },
    },
  ];

  for (const txData of transactionsToSeed) {
    const existingTx = await prisma.transaction.findUnique({
      where: { invoice_number: txData.invoice_number },
    });

    if (!existingTx) {
      await prisma.transaction.create({
        data: {
          invoice_number: txData.invoice_number,
          date: txData.date,
          status: txData.status,
          transaction_type: txData.transaction_type,
          subtotal: txData.subtotal,
          tax_total: txData.tax_total,
          discount_total: txData.discount_total,
          grand_total: txData.grand_total,
          customerId: txData.customerId,
          staffId: txData.staffId,
          transactionItems: {
            create: txData.items,
          },
          payments: {
            create: [
              {
                date: txData.date,
                amount_paid: txData.payment.amount_paid,
                payment_method: txData.payment.payment_method,
                ...(txData.payment.cashPayment && {
                  cashPayment: { create: txData.payment.cashPayment },
                }),
                ...(txData.payment.creditPayment && {
                  creditPayment: { create: txData.payment.creditPayment },
                }),
                ...(txData.payment.gCashPayment && {
                  gCashPayment: { create: txData.payment.gCashPayment },
                }),
              },
            ],
          },
        },
      });
    }
  }

  console.log('Seed: Dependent - Transactions & Payments seeded.');
}
