import { prisma } from '../client';

export async function seedBinLocations() {
  const locations = [
    { aisle_number: 'A1', shelf_location: 'S1-Top' },
    { aisle_number: 'A1', shelf_location: 'S2-Middle' },
    { aisle_number: 'A2', shelf_location: 'S1-Bottom' },
    { aisle_number: 'B1', shelf_location: 'Bin-01' },
    { aisle_number: 'B1', shelf_location: 'Bin-02' },
  ];

  for (const loc of locations) {
    await prisma.binLocation.upsert({
      where: {
        aisle_number_shelf_location: {
          aisle_number: loc.aisle_number,
          shelf_location: loc.shelf_location,
        },
      },
      update: {},
      create: loc,
    });
  }

  console.log('Seed: Bin locations seeded.');
}
