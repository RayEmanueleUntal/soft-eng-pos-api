import { prisma } from '../client';

export async function seedForwarders() {
  const forwarders = [
    {
      company_name: 'LBC Express',
      tracking_contact_info: '1-800-10-8585999 | support@lbcexpress.com',
    },
    {
      company_name: 'J&T Express',
      tracking_contact_info: '(02) 8911-1888 | customercare@jtexpress.ph',
    },
  ];

  for (const forwarder of forwarders) {
    const existing = await prisma.forwarder.findFirst({
      where: { company_name: forwarder.company_name },
    });

    if (!existing) {
      await prisma.forwarder.create({ data: forwarder });
    }
  }

  console.log('Seed: Forwarders seeded.');
}
