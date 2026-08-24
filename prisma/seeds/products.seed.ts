import { prisma } from '../client';

export async function seedProducts() {
  const boltsCategory = await prisma.category.findUnique({
    where: { name: 'Bolts' },
  });
  const binLocation = await prisma.binLocation.findFirst({
    where: { aisle_number: 'A1' },
  });

  if (!boltsCategory) {
    console.error('Seed Error: "Bolts" category not found for products.');
    return;
  }

  const products = [
    {
      sku: 'BLT-M8-30-SS',
      name: 'Hex Bolt M8-1.25 x 30mm Stainless',
      categoryId: boltsCategory.id,
      binId: binLocation?.id,
      size_dimensions: 'M8 x 30mm',
      thread_type: 'M8x1.25',
      material_grade: 'Stainless 304',
      base_uom: 'pcs',
      current_quantity: 500,
      reorder_point_ROP: 100,
      pricing_uom: 'pcs',
      pricing_unit_qty: 1,
      cost_price: 8.5,
      retail_price: 15.0,
      wholesale_price: 12.0,
    },
    {
      sku: 'BLT-M10-50-G8',
      name: 'Hex Bolt M10-1.5 x 50mm Grade 8',
      categoryId: boltsCategory.id,
      binId: binLocation?.id,
      size_dimensions: 'M10 x 50mm',
      thread_type: 'M10x1.5',
      material_grade: 'Grade 8',
      base_uom: 'pcs',
      current_quantity: 250,
      reorder_point_ROP: 50,
      pricing_uom: 'pcs',
      pricing_unit_qty: 1,
      cost_price: 18.0,
      retail_price: 30.0,
      wholesale_price: 25.0,
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {},
      create: prod,
    });
  }

  console.log('Seed: Products seeded.');
}
