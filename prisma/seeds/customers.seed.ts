import { CustomerType } from '../../src/generated/prisma/client';
import { prisma } from '../client';

export async function seedCustomers() {
  // 1. Retail Customer
  const retailCustomer = await prisma.customer.findFirst({
    where: { contact_number: '+639190001111' },
  });

  if (!retailCustomer) {
    await prisma.customer.create({
      data: {
        name: 'Walk-in Retail Customer',
        contact_number: '+639190001111',
        type: CustomerType.RETAIL,
      },
    });
  }

  // 2. Wholesale Customer with Profile
  const wholesaleCustomer = await prisma.customer.findFirst({
    where: { contact_number: '+639202223333' },
  });

  if (!wholesaleCustomer) {
    await prisma.customer.create({
      data: {
        name: 'BuildRight Construction',
        contact_number: '+639202223333',
        type: CustomerType.WHOLESALE,
        wholesale: {
          create: {
            company_name: 'BuildRight Construction Inc.',
            credit_limit: 100000.0,
            outstanding_balance: 0.0,
          },
        },
      },
    });
  }

  console.log('Seed: Customers seeded.');
}
