import { prisma } from '../client';

export async function seedCategories() {
  const categories = [
    'Bolts',
    'Nuts',
    'Washers',
    'Screws',
    'Drill Bits',
    'Hand Tools',
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
