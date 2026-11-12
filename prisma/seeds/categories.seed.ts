import { prisma } from '../client';

export async function seedCategories() {
  const categories = [
    'Bolts',
    'Nuts',
    'Washers',
    'Screws',
    'Drill Bits',
    'Hand Tools',
    'Anchors',
    'Electrical & Cable Management',
    'Chains, Ropes & Rigging',
    'Scaffolding & Clamps',
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Seed: Categories seeded.');
}
