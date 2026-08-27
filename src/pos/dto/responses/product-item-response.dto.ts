import { ApiProperty } from '@nestjs/swagger';
import {
  Product,
  BinLocation,
  UnitOfMeasure,
} from 'src/generated/prisma/client';

export class ProductItemResponseDto {
  @ApiProperty({
    example: 42,
    description: 'Unique primary key ID of the product',
  })
  id!: number;

  @ApiProperty({
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

  @ApiProperty({
    example: 'M8 x 30mm',
    nullable: true,
    description: 'Size and physical dimensions',
  })
  size_dimensions!: string | null;

  @ApiProperty({
    example: 'M8x1.25',
    nullable: true,
    description: 'Thread type specification (if applicable)',
  })
  thread_type!: string | null;

  @ApiProperty({
    example: 'Stainless 304',
    nullable: true,
    description: 'Material grade or plating type',
  })
  material_grade!: string | null;

  @ApiProperty({
    example: UnitOfMeasure.KG,
    description:
      'Base unit of measure used for inventory tracking (e.g., pcs, kg, meter)',
  })
  base_uom!: UnitOfMeasure;

  @ApiProperty({
    example: 150.0,
    description: 'Current available stock quantity in base units',
  })
  current_quantity!: number;

  @ApiProperty({
    example: UnitOfMeasure.KG,
    description: 'Unit of measure used for pricing (e.g., pcs, hundred, gross)',
  })
  pricing_uom!: UnitOfMeasure;

  @ApiProperty({
    example: 1.0,
    description:
      'Multiplier quantity for pricing uom (e.g., 100 for "Per Hundred")',
  })
  pricing_unit_qty!: number;

  @ApiProperty({ example: 5.0, description: 'Retail selling price per unit' })
  retail_price!: number;

  @ApiProperty({
    example: 4.25,
    nullable: true,
    description: 'Wholesale selling price per unit (optional)',
  })
  wholesale_price!: number | null;

  @ApiProperty({
    example: 12,
    nullable: true,
    description: 'ID of the storage bin location where the item is kept',
  })
  binId!: number | null;

  @ApiProperty({
    example: 'Aisle 3',
    nullable: true,
    description: 'Physical warehouse aisle number retrieved from BinLocation',
  })
  bin_aisle_number!: string | null;

  @ApiProperty({
    example: 'Shelf B-2',
    nullable: true,
    description:
      'Physical shelf location within the bin retrieved from BinLocation',
  })
  bin_shelf_location!: string | null;

  /**
   * Static Factory Method to transform Prisma Product model into response DTO
   */
  static fromEntity(
    product: Product & { bin_location?: BinLocation | null },
  ): ProductItemResponseDto {
    return {
      ...product,
      current_quantity: product.current_quantity.toNumber(),
      pricing_unit_qty: product.pricing_unit_qty.toNumber(),
      retail_price: product.retail_price.toNumber(),
      wholesale_price: product.wholesale_price
        ? product.wholesale_price.toNumber()
        : null,
      bin_aisle_number: product.bin_location?.aisle_number ?? null,
      bin_shelf_location: product.bin_location?.shelf_location ?? null,
    };
  }
}
