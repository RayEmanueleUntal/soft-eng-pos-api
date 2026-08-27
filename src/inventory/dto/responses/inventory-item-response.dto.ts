import { ApiProperty } from '@nestjs/swagger';
import {
  Product,
  BinLocation,
  UnitOfMeasure,
} from 'src/generated/prisma/client';

export class InventoryItemResponseDto {
  @ApiProperty({ example: 42 })
  id!: number;

  @ApiProperty({ example: 'BLT-M8-30-SS', nullable: true })
  sku!: string | null;

  @ApiProperty({ example: 'Hex Bolt M8-1.25 x 30mm' })
  name!: string;

  @ApiProperty({ example: 1 })
  categoryId!: number;

  @ApiProperty({ example: 'M8 x 30mm', nullable: true })
  size_dimensions!: string | null;

  @ApiProperty({ example: 'M8x1.25', nullable: true })
  thread_type!: string | null;

  @ApiProperty({ example: 'Stainless 304', nullable: true })
  material_grade!: string | null;

  @ApiProperty({ example: UnitOfMeasure.PCS })
  base_uom!: UnitOfMeasure;

  @ApiProperty({ example: 150.0 })
  current_quantity!: number;

  @ApiProperty({ example: 20.0 })
  reorder_point_ROP!: number;

  @ApiProperty({ example: false })
  needsRecount!: boolean;

  @ApiProperty({ example: UnitOfMeasure.PCS })
  pricing_uom!: UnitOfMeasure;

  @ApiProperty({ example: 1.0 })
  pricing_unit_qty!: number;

  @ApiProperty({ example: 2.5 })
  cost_price!: number;

  @ApiProperty({ example: 5.0 })
  retail_price!: number;

  @ApiProperty({ example: 4.25, nullable: true })
  wholesale_price!: number | null;

  @ApiProperty({ example: 12, nullable: true })
  binId!: number | null;

  @ApiProperty({ example: 'Aisle 3', nullable: true })
  bin_aisle_number!: string | null;

  @ApiProperty({ example: 'Shelf B-2', nullable: true })
  bin_shelf_location!: string | null;

  @ApiProperty({ example: '2026-03-31T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-31T10:00:00.000Z' })
  updatedAt!: Date;

  /**
   * Static Factory Method to transform Prisma Product model into response DTO
   */
  static fromEntity(
    product: Product & { bin_location?: BinLocation | null },
  ): InventoryItemResponseDto {
    return {
      ...product,
      current_quantity: product.current_quantity.toNumber(),
      reorder_point_ROP: product.reorder_point_ROP.toNumber(),
      pricing_unit_qty: product.pricing_unit_qty.toNumber(),
      cost_price: product.cost_price.toNumber(),
      retail_price: product.retail_price.toNumber(),
      wholesale_price: product.wholesale_price
        ? product.wholesale_price.toNumber()
        : null,
      bin_aisle_number: product.bin_location?.aisle_number ?? null,
      bin_shelf_location: product.bin_location?.shelf_location ?? null,
    };
  }
}
