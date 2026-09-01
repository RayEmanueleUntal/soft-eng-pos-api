import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BinLocation,
  Category,
  Product,
  UnitOfMeasure,
} from 'src/generated/prisma/client';
import { CategoryResponseDto } from './category-response.dto';
import { BinLocationResponseDto } from './bin-location-response.dto';

type ProductWithRelations = Product & {
  category?: Category | null;
  bin_location?: BinLocation | null;
};

export class ProductResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ example: 'BLT-M8-30-SS', nullable: true })
  sku!: string | null;

  @ApiProperty({ example: 'Hex Bolt M8-1.25 x 30mm' })
  name!: string;

  @ApiProperty({ example: 1 })
  categoryId!: number;

  @ApiPropertyOptional({ type: CategoryResponseDto, nullable: true })
  category!: CategoryResponseDto | null;

  @ApiPropertyOptional({ example: 'M8 x 30mm', nullable: true })
  size_dimensions!: string | null;

  @ApiPropertyOptional({ example: 'M8x1.25', nullable: true })
  thread_type!: string | null;

  @ApiPropertyOptional({ example: 'Stainless 304', nullable: true })
  material_grade!: string | null;

  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.PCS })
  base_uom!: UnitOfMeasure;

  @ApiProperty({ example: 100.0 })
  current_quantity!: number;

  @ApiProperty({ example: 20.0 })
  reorder_point_ROP!: number;

  @ApiProperty({ example: false })
  needsRecount!: boolean;

  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.PCS })
  pricing_uom!: UnitOfMeasure;

  @ApiProperty({ example: 1.0 })
  pricing_unit_qty!: number;

  @ApiProperty({ example: 12.5 })
  cost_price!: number;

  @ApiProperty({ example: 25.0 })
  retail_price!: number;

  @ApiPropertyOptional({ example: 20.0, nullable: true })
  wholesale_price!: number | null;

  @ApiPropertyOptional({ example: 4, nullable: true })
  binId!: number | null;

  @ApiPropertyOptional({ type: BinLocationResponseDto, nullable: true })
  bin_location!: BinLocationResponseDto | null;

  @ApiProperty({ example: '2026-09-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-01T10:00:00.000Z' })
  updatedAt!: Date;

  static fromEntity(entity: ProductWithRelations): ProductResponseDto {
    return {
      id: entity.id,
      sku: entity.sku,
      name: entity.name,
      categoryId: entity.categoryId,
      category: entity.category
        ? CategoryResponseDto.fromEntity(entity.category)
        : null,
      size_dimensions: entity.size_dimensions,
      thread_type: entity.thread_type,
      material_grade: entity.material_grade,
      base_uom: entity.base_uom,
      current_quantity: entity.current_quantity.toNumber(),
      reorder_point_ROP: entity.reorder_point_ROP.toNumber(),
      needsRecount: entity.needsRecount,
      pricing_uom: entity.pricing_uom,
      pricing_unit_qty: entity.pricing_unit_qty.toNumber(),
      cost_price: entity.cost_price.toNumber(),
      retail_price: entity.retail_price.toNumber(),
      wholesale_price: entity.wholesale_price
        ? entity.wholesale_price.toNumber()
        : null,
      binId: entity.binId,
      bin_location: entity.bin_location
        ? BinLocationResponseDto.fromEntity(entity.bin_location)
        : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
