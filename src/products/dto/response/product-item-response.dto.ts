import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Product,
  BinLocation,
  ProductUom,
  UnitOfMeasure,
  Category,
} from 'src/generated/prisma/client';
import { ProductUomResponseDto } from './product-uom-response.dto';

type ProductItemWithRelations = Product & {
  category?: Category | null;
  bin_location?: BinLocation | null;
  uoms?: ProductUom[];
};

export class ProductItemResponseDto {
  @ApiProperty({
    example: 42,
    description: 'Unique primary key ID of the product',
  })
  id!: number;

  @ApiPropertyOptional({
    example: 'BLT-M8-30-SS',
    nullable: true,
    description: 'Shorthand code, SKU, or bin barcode',
  })
  sku!: string | null;

  @ApiProperty({
    example: 'Hex Bolt M8-1.25 x 30mm',
    description: 'Descriptive name of the product',
  })
  name!: string;

  @ApiProperty({
    example: 1,
    description: 'ID of the category this product belongs to',
  })
  categoryId!: number;

  @ApiPropertyOptional({
    example: 'Fasteners & Bolts',
    nullable: true,
    description: 'Category name retrieved from Category relation',
  })
  category_name!: string | null;

  @ApiPropertyOptional({
    example: 'M8 x 30mm',
    nullable: true,
    description: 'Size and physical dimensions',
  })
  size_dimensions!: string | null;

  @ApiPropertyOptional({
    example: 'M8x1.25',
    nullable: true,
    description: 'Thread type specification (if applicable)',
  })
  thread_type!: string | null;

  @ApiPropertyOptional({
    example: 'Stainless 304',
    nullable: true,
    description: 'Material grade or plating type',
  })
  material_grade!: string | null;

  @ApiProperty({
    enum: UnitOfMeasure,
    example: UnitOfMeasure.PCS,
    description: 'Base unit of measure used for inventory tracking',
  })
  base_uom!: UnitOfMeasure;

  @ApiProperty({
    example: 150.0,
    description: 'Current available stock quantity in base units',
  })
  current_quantity!: number;

  @ApiProperty({
    example: 20.0,
    description: 'Reorder point trigger quantity',
  })
  reorder_point_ROP!: number;

  @ApiProperty({
    example: false,
    description: 'Indicates if an inventory recount is required',
  })
  needsRecount!: boolean;

  @ApiProperty({
    example: 5.0,
    description: 'Purchasing cost price per base unit',
  })
  cost_price!: number;

  @ApiProperty({
    example: 8.5,
    description: 'Retail selling price per base unit',
  })
  retail_price!: number;

  @ApiPropertyOptional({
    example: 7.0,
    nullable: true,
    description: 'Wholesale selling price per base unit',
  })
  wholesale_price!: number | null;

  @ApiPropertyOptional({
    example: 12,
    nullable: true,
    description: 'ID of the storage bin location where the item is kept',
  })
  binId!: number | null;

  @ApiPropertyOptional({
    example: 'Aisle 3',
    nullable: true,
    description: 'Physical warehouse aisle number retrieved from BinLocation',
  })
  bin_aisle_number!: string | null;

  @ApiPropertyOptional({
    example: 'Shelf B-2',
    nullable: true,
    description:
      'Physical shelf location within the bin retrieved from BinLocation',
  })
  bin_shelf_location!: string | null;

  @ApiPropertyOptional({
    type: [ProductUomResponseDto],
    description: 'Configured alternate units of measure with calculated prices',
  })
  uoms!: ProductUomResponseDto[];

  /**
   * Static Factory Method to transform Prisma Product model into response DTO
   */
  static fromEntity(product: ProductItemWithRelations): ProductItemResponseDto {
    const cost_price = Number(product.cost_price ?? 0);
    const retail_price = Number(product.retail_price ?? 0);
    const wholesale_price =
      product.wholesale_price !== null && product.wholesale_price !== undefined
        ? Number(product.wholesale_price)
        : null;

    const basePrices = { cost_price, retail_price, wholesale_price };

    const uoms = Array.isArray(product.uoms)
      ? product.uoms.map((uomEntity) =>
          ProductUomResponseDto.fromEntity(uomEntity, basePrices),
        )
      : [];

    return {
      id: product.id,
      sku: product.sku ?? null,
      name: product.name,
      categoryId: product.categoryId,
      category_name: product.category?.name ?? null, // Extracted category name cleanly
      size_dimensions: product.size_dimensions ?? null,
      thread_type: product.thread_type ?? null,
      material_grade: product.material_grade ?? null,
      base_uom: product.base_uom,
      current_quantity: Number(product.current_quantity ?? 0),
      reorder_point_ROP: Number(product.reorder_point_ROP ?? 0),
      needsRecount: product.needsRecount ?? false,
      cost_price,
      retail_price,
      wholesale_price,
      binId: product.binId ?? null,
      bin_aisle_number: product.bin_location?.aisle_number ?? null,
      bin_shelf_location: product.bin_location?.shelf_location ?? null,
      uoms,
    };
  }
}
