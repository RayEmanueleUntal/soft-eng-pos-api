import { CustomerType, PaymentMethod } from '../../src/generated/prisma/client'; // Adjust import path if needed
import { prisma } from '../client';

export async function seedCustomers() {
  // 1. Fetch reference staff member to associate with customer settlement payments
  const staff = await prisma.staffUser.findFirst();
  if (!staff) {
    throw new Error(
      'Please run staff seeding before running customer seeding.',
    );
  }

  // 2. Define Customer Seed Data
  const customersData = [
    {
      name: 'Walk-in Retail Customer',
      contact_number: '+639190001111',
      type: CustomerType.RETAIL,
    },
    {
      name: 'Juan Dela Cruz',
      contact_number: '+639171112222',
      type: CustomerType.RETAIL,
    },
    {
      name: 'BuildRight Construction',
      contact_number: '+639202223333',
      type: CustomerType.WHOLESALE,
      wholesale: {
        company_name: 'BuildRight Construction Inc.',
        credit_limit: 100000.0,
        outstanding_balance: 15000.0,
        payments: [
          {
            amount_paid: 5000.0,
            payment_method: PaymentMethod.CASH,
            reference_number: null,
            notes: 'Initial partial payment for June credit invoice',
            previous_balance: 20000.0,
            new_balance: 15000.0,
          },
        ],
      },
    },
    {
      name: 'Apex Hardware & Supply',
      contact_number: '+639185554444',
      type: CustomerType.WHOLESALE,
      wholesale: {
        company_name: 'Apex Hardware Solutions Co.',
        credit_limit: 250000.0,
        outstanding_balance: 0.0,
        payments: [],
      },
    },
    {
      name: 'Metro Steel Works',
      contact_number: '+639998887777',
      type: CustomerType.WHOLESALE,
      wholesale: {
        company_name: 'Metro Steel Fabrication Corp.',
        credit_limit: 150000.0,
        outstanding_balance: 42500.5,
        payments: [
          {
            amount_paid: 10000.0,
            payment_method: PaymentMethod.GCASH,
            reference_number: 'GCASH-88392019',
            notes: 'Settlement via GCash transfer',
            previous_balance: 52500.5,
            new_balance: 42500.5,
          },
        ],
      },
    },
    {
      name: 'Vanguard Engineering Services',
      contact_number: '+639274449999',
      type: CustomerType.WHOLESALE,
      wholesale: {
        company_name: 'Vanguard Engineering Ltd.',
        credit_limit: 80000.0,
        outstanding_balance: 80000.0,
        payments: [],
      },
    },
  ];

  // 3. Process Seed Records
  for (const item of customersData) {
    let customer = await prisma.customer.findFirst({
      where: { contact_number: item.contact_number },
      include: { wholesale: true },
    });

    if (!customer) {
      if (item.type === CustomerType.WHOLESALE && item.wholesale) {
        customer = await prisma.customer.create({
          data: {
            name: item.name,
            contact_number: item.contact_number,
            type: item.type,
            wholesale: {
              create: {
                company_name: item.wholesale.company_name,
                credit_limit: item.wholesale.credit_limit,
                outstanding_balance: item.wholesale.outstanding_balance,
              },
            },
          },
          include: { wholesale: true },
        });

        // Seed settlement payment history if available for this wholesale account
        if (
          customer.wholesale &&
          item.wholesale.payments &&
          item.wholesale.payments.length > 0
        ) {
          for (const pay of item.wholesale.payments) {
            await prisma.customerPayment.create({
              data: {
                wholesaleCustId: customer.wholesale.customerId,
                staffId: staff.id,
                amount_paid: pay.amount_paid,
                payment_method: pay.payment_method,
                reference_number: pay.reference_number,
                notes: pay.notes,
                previous_balance: pay.previous_balance,
                new_balance: pay.new_balance,
              },
            });
          }
        }
      } else {
        await prisma.customer.create({
          data: {
            name: item.name,
            contact_number: item.contact_number,
            type: item.type,
          },
        });
      }
    }
  }

  console.log('Seed: Customers & Wholesale Profiles seeded successfully.');
}
