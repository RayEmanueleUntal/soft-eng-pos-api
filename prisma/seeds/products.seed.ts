import { UnitOfMeasure } from 'src/generated/prisma/client'; // Adjust import path to your generated Prisma client if needed
import { prisma } from '../client';

export async function seedProducts() {
  // 1. Fetch reference data needed for foreign keys
  const categoryMap = new Map<string, number>();
  const categories = await prisma.category.findMany();
  categories.forEach((cat) => categoryMap.set(cat.name, cat.id));

  const binMap = new Map<string, number>();
  const bins = await prisma.binLocation.findMany();
  bins.forEach((bin) =>
    binMap.set(`${bin.aisle_number}-${bin.shelf_location}`, bin.id),
  );

  const defaultCategoryId = categories[0]?.id;
  const defaultBinId = bins[0]?.id;

  if (!defaultCategoryId) {
    throw new Error(
      'Please run category seeding before running product seeding.',
    );
  }

  const productsData = [
    {
      sku: 'BLT-M8-30-SS',
      name: 'Hex Bolt M8-1.25 x 30mm',
      categoryName: 'Bolts', // Auxiliary field for mapping
      size_dimensions: 'M8 x 30mm',
      thread_type: 'Coarse (UNC)',
      material_grade: 'Stainless 304',
      base_uom: UnitOfMeasure.PCS,
      current_quantity: 500,
      reorder_point_ROP: 100,
      cost_price: 5.5,
      retail_price: 10.0,
      wholesale_price: 8.5,
      aisle: 'A1',
      shelf: 'S1',
    },
    {
      sku: 'NUT-M8-SS',
      name: 'Hex Nut M8-1.25',
      categoryName: 'Nuts',
      size_dimensions: 'M8',
      thread_type: 'Coarse (UNC)',
      material_grade: 'Stainless 304',
      base_uom: UnitOfMeasure.PCS,
      current_quantity: 1000,
      reorder_point_ROP: 200,
      cost_price: 2.0,
      retail_price: 4.0,
      wholesale_price: 3.2,
      aisle: 'A1',
      shelf: 'S2',
    },
    {
      sku: 'WSH-M8-SS',
      name: 'Flat Washer M8',
      categoryName: 'Washers',
      size_dimensions: 'M8',
      material_grade: 'Stainless 304',
      base_uom: UnitOfMeasure.PCS,
      current_quantity: 1500,
      reorder_point_ROP: 300,
      cost_price: 1.0,
      retail_price: 2.5,
      wholesale_price: 1.8,
      aisle: 'A2',
      shelf: 'S1',
    },
  ];

  for (const item of productsData) {
    const categoryId = categoryMap.get(item.categoryName) || defaultCategoryId;
    const binId = binMap.get(`${item.aisle}-${item.shelf}`) || defaultBinId;

    await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        categoryId: categoryId,
        size_dimensions: item.size_dimensions,
        thread_type: item.thread_type,
        material_grade: item.material_grade,
        base_uom: item.base_uom,
        current_quantity: item.current_quantity,
        reorder_point_ROP: item.reorder_point_ROP,
        cost_price: item.cost_price,
        retail_price: item.retail_price,
        wholesale_price: item.wholesale_price,
        binId: binId,
      },
      create: {
        sku: item.sku,
        name: item.name,
        categoryId: categoryId,
        size_dimensions: item.size_dimensions,
        thread_type: item.thread_type,
        material_grade: item.material_grade,
        base_uom: item.base_uom,
        current_quantity: item.current_quantity,
        reorder_point_ROP: item.reorder_point_ROP,
        cost_price: item.cost_price,
        retail_price: item.retail_price,
        wholesale_price: item.wholesale_price,
        binId: binId,
      },
    });
  }

  console.log('Seed: Products seeded.');
}
