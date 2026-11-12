import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { Prisma, UnitOfMeasure } from 'src/generated/prisma/client';
import { prisma } from '../client';

function cleanString(val: string | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null') return null;
  return trimmed;
}

function cleanNumber(val: string | undefined): number | null {
  const str = cleanString(val);
  if (str === null) return null;
  const num = Number(str);
  return isNaN(num) ? null : num;
}

function cleanBoolean(val: string | undefined, defaultVal = false): boolean {
  const str = cleanString(val);
  if (str === null) return defaultVal;
  return ['true', '1', 'yes'].includes(str.toLowerCase());
}

function generateAutoSku(
  categoryName: string,
  size?: string | null,
  thread?: string | null,
  material?: string | null,
  rowIndex = 0,
): string {
  const catPrefix = categoryName.trim().substring(0, 3).toUpperCase();
  const cleanSize = size ? size.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
  const cleanThread = thread
    ? thread.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    : '';
  const cleanMat = material
    ? material.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    : '';

  const suffix = ((Date.now() + rowIndex) % 10000).toString().padStart(4, '0');

  return [catPrefix, cleanSize, cleanThread, cleanMat, suffix]
    .filter(Boolean)
    .join('-');
}

export async function seedProductsFromCsv() {
  const dataDir = path.join(__dirname, 'data');
  const baseCsvPath = path.join(dataDir, 'Products - Base UOMs.csv');
  const altCsvPath = path.join(dataDir, 'Products - Alt UOMs.csv');

  if (!fs.existsSync(baseCsvPath) || !fs.existsSync(altCsvPath)) {
    throw new Error(`CSV files not found in ${dataDir}`);
  }

  const baseRecords = parse(fs.readFileSync(baseCsvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const altRecords = parse(fs.readFileSync(altCsvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  // 1. Pre-fetch categories & existing products
  const [categories, existingProducts] = await Promise.all([
    prisma.category.findMany(),
    prisma.product.findMany({ select: { id: true, name: true, sku: true } }),
  ]);

  const defaultCategory = categories[0];
  if (!defaultCategory) {
    throw new Error('Please run category seeding before seeding products.');
  }

  // Lookup maps for BOTH Category Name (case-insensitive) and Category ID
  const categoryNameToObj = new Map(
    categories.map((c) => [c.name.trim().toLowerCase(), c]),
  );
  const categoryIdToObj = new Map(categories.map((c) => [c.id, c]));

  const existingByNameMap = new Map(
    existingProducts.map((p) => [p.name.toLowerCase(), p]),
  );

  const productsToCreate: Prisma.ProductCreateManyInput[] = [];
  const productsToUpdate: { id: number; data: Prisma.ProductUpdateInput }[] =
    [];

  // 2. Prepare Base Products
  for (let i = 0; i < baseRecords.length; i++) {
    const row = baseRecords[i];
    const csvSku = cleanString(row['SKU']);
    const name = cleanString(row['Name']);
    if (!name) continue;

    // Resolve category whether the column contains a Name ("Screws") or an ID ("4")
    const rawCategoryVal = cleanString(row['Category ID']);
    let resolvedCategory = defaultCategory;

    if (rawCategoryVal) {
      const asNum = Number(rawCategoryVal);
      if (!isNaN(asNum) && categoryIdToObj.has(asNum)) {
        resolvedCategory = categoryIdToObj.get(asNum)!;
      } else {
        const byName = categoryNameToObj.get(rawCategoryVal.toLowerCase());
        if (byName) {
          resolvedCategory = byName;
        } else {
          console.warn(
            `Unknown category "${rawCategoryVal}" for "${name}", defaulting to "${defaultCategory.name}"`,
          );
        }
      }
    }

    const size_dimensions = cleanString(row['Size Dimensions']);
    const thread_type = cleanString(row['Thread Type']);
    const material_grade = cleanString(row['Material Grade']);

    const rawBaseUom = cleanString(row['Base UOM'])?.toUpperCase() || 'PCS';
    const base_uom =
      (UnitOfMeasure as Record<string, UnitOfMeasure>)[rawBaseUom] ??
      UnitOfMeasure.PCS;

    const current_quantity = cleanNumber(row['Current Qty.']) ?? 0;
    const reorder_point_ROP = cleanNumber(row['ROP']) ?? 0;
    const needsRecount = cleanBoolean(row['Needs Recount'], false);
    const cost_price = cleanNumber(row['Cost Price']) ?? 0;
    const retail_price = cleanNumber(row['Retail Price']) ?? 0;
    const binId = cleanNumber(row['Bin ID']);

    const existing = existingByNameMap.get(name.toLowerCase());
    const finalSku =
      csvSku ??
      existing?.sku ??
      generateAutoSku(
        resolvedCategory.name,
        size_dimensions,
        thread_type,
        material_grade,
        i,
      );

    const baseData = {
      sku: finalSku,
      name,
      categoryId: resolvedCategory.id,
      size_dimensions,
      thread_type,
      material_grade,
      base_uom,
      current_quantity,
      reorder_point_ROP,
      needsRecount,
      cost_price,
      retail_price,
      binId,
    };

    if (existing) {
      productsToUpdate.push({ id: existing.id, data: baseData });
    } else {
      productsToCreate.push(baseData);
    }
  }

  // 3. Bulk insert & batched updates for Base Products
  if (productsToCreate.length > 0) {
    await prisma.product.createMany({
      data: productsToCreate,
      skipDuplicates: true,
    });
  }

  const CHUNK_SIZE = 250;
  for (let i = 0; i < productsToUpdate.length; i += CHUNK_SIZE) {
    const chunk = productsToUpdate.slice(i, i + CHUNK_SIZE);
    await prisma.$transaction(
      chunk.map((item) =>
        prisma.product.update({ where: { id: item.id }, data: item.data }),
      ),
    );
  }

  // 4. Reload Product IDs & Existing UOMs
  const [allProducts, existingUoms] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true } }),
    prisma.productUom.findMany({
      select: { id: true, productId: true, uom: true },
    }),
  ]);

  const productNameToId = new Map(
    allProducts.map((p) => [p.name.toLowerCase(), p.id]),
  );
  const existingUomMap = new Map(
    existingUoms.map((u) => [`${u.productId}-${u.uom}`, u.id]),
  );

  // 5. Prepare & Bulk Insert/Update Alt UOMs
  const uomsToCreate: Prisma.ProductUomCreateManyInput[] = [];
  const uomsToUpdate: { id: number; data: Prisma.ProductUomUpdateInput }[] = [];

  for (const row of altRecords) {
    const productName = cleanString(row['Product Name']);
    if (!productName) continue;

    const productId = productNameToId.get(productName.toLowerCase());
    if (!productId) continue;

    const rawUom = cleanString(row['UOM'])?.toUpperCase();
    const uom = rawUom
      ? (UnitOfMeasure as Record<string, UnitOfMeasure>)[rawUom]
      : undefined;
    if (!uom) continue;

    const conversion_factor = cleanNumber(row['Conversion Factor']) ?? 1;
    const cost_price = cleanNumber(row['Cost Price']);
    const retail_price = cleanNumber(row['Retail Price']);
    const wholesale_price = cleanNumber(row['Wholesale Price']);

    const existingUomId = existingUomMap.get(`${productId}-${uom}`);
    const uomData = {
      conversion_factor,
      cost_price,
      retail_price,
      wholesale_price,
    };

    if (existingUomId) {
      uomsToUpdate.push({ id: existingUomId, data: uomData });
    } else {
      uomsToCreate.push({ productId, uom, ...uomData });
    }
  }

  if (uomsToCreate.length > 0) {
    await prisma.productUom.createMany({
      data: uomsToCreate,
      skipDuplicates: true,
    });
  }

  for (let i = 0; i < uomsToUpdate.length; i += CHUNK_SIZE) {
    const chunk = uomsToUpdate.slice(i, i + CHUNK_SIZE);
    await prisma.$transaction(
      chunk.map((item) =>
        prisma.productUom.update({ where: { id: item.id }, data: item.data }),
      ),
    );
  }

  console.log(
    `Seed: CSV loaded (${productsToCreate.length} created, ${productsToUpdate.length} updated, ${uomsToCreate.length} UOMs created).`,
  );
}
