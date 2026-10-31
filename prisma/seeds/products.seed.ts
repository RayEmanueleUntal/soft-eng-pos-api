import { UnitOfMeasure } from 'src/generated/prisma/client'; // Adjust import path if needed
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

  // 2. Define products with updated schema attributes & alternate UoMs
  const productsData = [
    {
      sku: 'BLT-M8-30-SS',
      name: 'Hex Bolt M8-1.25 x 30mm',
      categoryName: 'Bolts',
      size_dimensions: 'M8 x 30mm',
      thread_type: 'Coarse (UNC)',
      material_grade: 'Stainless 304',
      base_uom: UnitOfMeasure.PCS,
      current_quantity: 500.0,
      reorder_point_ROP: 100.0,
      needsRecount: false,
      cost_price: 5.5,
      retail_price: 10.0,
      wholesale_price: 8.5,
      aisle: 'A1',
      shelf: 'S1',
      uoms: [
        {
          uom: UnitOfMeasure.BOX,
          conversion_factor: 100,
          cost_price: 500.0,
          retail_price: 950.0,
          wholesale_price: 800.0,
          is_default_purchase: true,
          is_default_sales: false,
        },
        {
          uom: UnitOfMeasure.SACK,
          conversion_factor: 1000,
          cost_price: 4800.0,
          retail_price: 9000.0,
          wholesale_price: 7500.0,
          is_default_purchase: false,
          is_default_sales: false,
        },
      ],
    },
    {
      sku: 'NUT-M8-SS',
      name: 'Hex Nut M8-1.25',
      categoryName: 'Nuts',
      size_dimensions: 'M8',
      thread_type: 'Coarse (UNC)',
      material_grade: 'Stainless 304',
      base_uom: UnitOfMeasure.PCS,
      current_quantity: 1000.0,
      reorder_point_ROP: 200.0,
      needsRecount: false,
      cost_price: 2.0,
      retail_price: 4.0,
      wholesale_price: 3.2,
      aisle: 'A1',
      shelf: 'S2',
      uoms: [
        {
          uom: UnitOfMeasure.BOX,
          conversion_factor: 250,
          cost_price: 450.0,
          retail_price: 900.0,
          wholesale_price: 720.0,
          is_default_purchase: true,
          is_default_sales: false,
        },
      ],
    },
    {
      sku: 'WSH-M8-SS',
      name: 'Flat Washer M8',
      categoryName: 'Washers',
      size_dimensions: 'M8',
      thread_type: null,
      material_grade: 'Stainless 304',
      base_uom: UnitOfMeasure.PCS,
      current_quantity: 1500.0,
      reorder_point_ROP: 300.0,
      needsRecount: false,
      cost_price: 1.0,
      retail_price: 2.5,
      wholesale_price: 1.8,
      aisle: 'A2',
      shelf: 'S1',
      uoms: [
        {
          uom: UnitOfMeasure.HUNDRED,
          conversion_factor: 100,
          cost_price: 90.0,
          retail_price: 230.0,
          wholesale_price: 160.0,
          is_default_purchase: true,
          is_default_sales: true,
        },
      ],
    },
    {
      sku: 'DRL-HSS-08',
      name: 'HSS Twist Drill Bit 8mm',
      categoryName: 'Tools',
      size_dimensions: '8mm',
      thread_type: null,
      material_grade: 'High-Speed Steel',
      base_uom: UnitOfMeasure.PCS,
      current_quantity: 45.0,
      reorder_point_ROP: 10.0,
      needsRecount: false,
      cost_price: 15.0,
      retail_price: 35.0,
      wholesale_price: 28.0,
      aisle: 'A2',
      shelf: 'S2',
      uoms: [
        {
          uom: UnitOfMeasure.SET,
          conversion_factor: 5,
          cost_price: 70.0,
          retail_price: 160.0,
          wholesale_price: 130.0,
          is_default_purchase: true,
          is_default_sales: true,
        },
      ],
    },
    {
      sku: 'SCR-WD-4-50',
      name: 'Wood Screw 4.0 x 50mm',
      categoryName: 'Screws',
      size_dimensions: '4.0 x 50mm',
      thread_type: 'Single Thread',
      material_grade: 'Zinc Plated',
      base_uom: UnitOfMeasure.PCS,
      current_quantity: 2500.0,
      reorder_point_ROP: 500.0,
      needsRecount: false,
      cost_price: 0.5,
      retail_price: 1.2,
      wholesale_price: 0.9,
      aisle: 'A1',
      shelf: 'S1',
      uoms: [
        {
          uom: UnitOfMeasure.BOX,
          conversion_factor: 500,
          cost_price: 220.0,
          retail_price: 550.0,
          wholesale_price: 400.0,
          is_default_purchase: true,
          is_default_sales: true,
        },
      ],
    },
  ];

  // 3. Upsert products and nested ProductUom records
  for (const item of productsData) {
    const categoryId = categoryMap.get(item.categoryName) || defaultCategoryId;
    const binId = binMap.get(`${item.aisle}-${item.shelf}`) || defaultBinId;

    const product = await prisma.product.upsert({
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
        needsRecount: item.needsRecount,
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
        needsRecount: item.needsRecount,
        cost_price: item.cost_price,
        retail_price: item.retail_price,
        wholesale_price: item.wholesale_price,
        binId: binId,
      },
    });

    // Seed alternate UOMs if present
    if (item.uoms && item.uoms.length > 0) {
      for (const uomData of item.uoms) {
        await prisma.productUom.upsert({
          where: {
            productId_uom: {
              productId: product.id,
              uom: uomData.uom,
            },
          },
          update: {
            conversion_factor: uomData.conversion_factor,
            cost_price: uomData.cost_price,
            retail_price: uomData.retail_price,
            wholesale_price: uomData.wholesale_price,
            is_default_purchase: uomData.is_default_purchase,
            is_default_sales: uomData.is_default_sales,
          },
          create: {
            productId: product.id,
            uom: uomData.uom,
            conversion_factor: uomData.conversion_factor,
            cost_price: uomData.cost_price,
            retail_price: uomData.retail_price,
            wholesale_price: uomData.wholesale_price,
            is_default_purchase: uomData.is_default_purchase,
            is_default_sales: uomData.is_default_sales,
          },
        });
      }
    }
  }

  console.log('Seed: Products and alternate UOMs seeded successfully.');
}
