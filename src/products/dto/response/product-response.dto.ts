import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BinLocation,
  Category,
  Product,
  ProductUom,
  UnitOfMeasure,
} from 'src/generated/prisma/client';
import { CategoryResponseDto } from './category-response.dto';
import { ProductBinLocationResponseDto } from './bin-location-response.dto';
import { ProductUomResponseDto } from './product-uom-response.dto';

/**
 * Type extension for Product Prisma entity including optional relations.
 */
export type ProductWithRelations = Product & {
  category?: Category | null;
  bin_location?: BinLocation | null;
  uoms?: ProductUom[];
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

  @ApiProperty({
    example: 100.0,
    description: 'Current total quantity in Base UoM',
  })
  current_quantity!: number;

  @ApiProperty({
    example: 20.0,
    description: 'Reorder Point (ROP) trigger level in Base UoM',
  })
  reorder_point_ROP!: number;

  @ApiProperty({
    example: false,
    description: 'Indicates if an inventory recount is required',
  })
  needsRecount!: boolean;

  @ApiProperty({
    example: 12.5,
    description: 'Base unit purchasing cost price',
  })
  cost_price!: number;

  @ApiProperty({ example: 25.0, description: 'Base unit retail selling price' })
  retail_price!: number;

  @ApiPropertyOptional({
    example: 20.0,
    nullable: true,
    description: 'Base unit wholesale selling price',
  })
  wholesale_price!: number | null;

  @ApiPropertyOptional({ example: 4, nullable: true })
  binId!: number | null;

  @ApiPropertyOptional({ type: ProductBinLocationResponseDto, nullable: true })
  bin_location!: ProductBinLocationResponseDto | null;

  @ApiPropertyOptional({
    type: [ProductUomResponseDto],
    description:
      'Configured alternate units of measure with explicit and calculated price conversions',
  })
  uoms!: ProductUomResponseDto[];

  @ApiProperty({ example: '2026-09-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-01T10:00:00.000Z' })
  updatedAt!: Date;

  /**
   * Factory method to sanitize and map Prisma Product entity to ProductResponseDto.
   */
  static fromEntity(entity: ProductWithRelations): ProductResponseDto {
    const cost_price = Number(entity.cost_price ?? 0);
    const retail_price = Number(entity.retail_price ?? 0);
    const wholesale_price =
      entity.wholesale_price !== null && entity.wholesale_price !== undefined
        ? Number(entity.wholesale_price)
        : null;

    const basePrices = { cost_price, retail_price, wholesale_price };

    const uoms = Array.isArray(entity.uoms)
      ? entity.uoms.map((uomEntity: any) =>
          ProductUomResponseDto.fromEntity(uomEntity, basePrices),
        )
      : [];

    return {
      id: entity.id,
      sku: entity.sku ?? null,
      name: entity.name,
      categoryId: entity.categoryId,
      category: entity.category
        ? CategoryResponseDto.fromEntity(entity.category)
        : null,
      size_dimensions: entity.size_dimensions ?? null,
      thread_type: entity.thread_type ?? null,
      material_grade: entity.material_grade ?? null,
      base_uom: entity.base_uom,
      current_quantity: Number(entity.current_quantity ?? 0),
      reorder_point_ROP: Number(entity.reorder_point_ROP ?? 0),
      needsRecount: entity.needsRecount ?? false,
      cost_price,
      retail_price,
      wholesale_price,
      binId: entity.binId ?? null,
      bin_location: entity.bin_location
        ? ProductBinLocationResponseDto.fromEntity(entity.bin_location)
        : null,
      uoms,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
