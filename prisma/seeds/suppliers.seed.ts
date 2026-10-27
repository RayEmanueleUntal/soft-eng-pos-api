import { prisma } from '../client';

export async function seedSuppliers() {
  const suppliers = [
    {
      name: 'Apex Fasteners Corp',
      contact_number: '+63 917 111 2222',
      email: 'sales@apexfasteners.ph',
      location: 'Valenzuela City, Metro Manila',
      lead_time_days: 3,
    },
    {
      name: 'Industrial Hardware Philippines',
      contact_number: '+63 918 333 4444',
      email: 'orders@indhardware.ph',
      location: 'Cebu City, Cebu',
      lead_time_days: 5,
    },
  ];

  for (const supplier of suppliers) {
    const existing = await prisma.supplier.findFirst({
      where: { name: supplier.name },
    });

    if (!existing) {
      await prisma.supplier.create({ data: supplier });
    }
  }

  console.log('Seed: Suppliers seeded.');
}
