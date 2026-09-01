import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

export class CreateProductDto {
  @ApiPropertyOptional({
    example: 'BLT-M8-30-SS',
    description:
      'Unique barcode or shorthand SKU identifier. If explicitly set to empty string or null, an auto-generated SKU will be built based on attributes.',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({
    example: 'Hex Bolt M8-1.25 x 30mm',
    description: 'Descriptive title of the product',
  })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    example: 1,
    description: 'ID of the parent Category entity',
  })
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  categoryId!: number;

  @ApiPropertyOptional({
    example: 'M8 x 30mm',
    description: 'Fastener dimension specifier',
  })
  @IsOptional()
  @IsString()
  size_dimensions?: string;

  @ApiPropertyOptional({
    example: 'M8x1.25',
    description: 'Thread type specifier (Coarse, Fine, Pitch)',
  })
  @IsOptional()
  @IsString()
  thread_type?: string;

  @ApiPropertyOptional({
    example: 'Stainless 304',
    description: 'Material composition or hardness grade',
  })
  @IsOptional()
  @IsString()
  material_grade?: string;

  @ApiPropertyOptional({
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    default: UnitOfMeasure.PCS,
    example: UnitOfMeasure.PCS,
    description: 'Base inventory measurement unit',
  })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  base_uom?: UnitOfMeasure = UnitOfMeasure.PCS;

  @ApiPropertyOptional({
    example: 100.0,
    default: 0.0,
    description: 'Initial physical inventory count in base units',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  current_quantity?: number = 0;

  @ApiPropertyOptional({
    example: 20.0,
    default: 0.0,
    description: 'Reorder Point threshold triggering restock warnings',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorder_point_ROP?: number = 0;

  @ApiPropertyOptional({
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    default: UnitOfMeasure.PCS,
    example: UnitOfMeasure.PCS,
    description: 'Bulk pricing unit specification',
  })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  pricing_uom?: UnitOfMeasure = UnitOfMeasure.PCS;

  @ApiPropertyOptional({
    example: 1.0,
    default: 1.0,
    description:
      'Quantity multiplier for pricing_uom (e.g. 100 for per hundred)',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  pricing_unit_qty?: number = 1.0;

  @ApiPropertyOptional({
    example: 12.5,
    default: 0.0,
    description: 'Acquisition cost per pricing unit',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost_price?: number = 0;

  @ApiProperty({
    example: 25.0,
    description: 'Standard retail sales price per pricing unit (VAT-inclusive)',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  retail_price!: number;

  @ApiPropertyOptional({
    example: 20.0,
    description: 'Special wholesale sales price per pricing unit',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  wholesale_price?: number;

  @ApiPropertyOptional({
    example: 4,
    description: 'ID of the physical BinLocation entity',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  binId?: number;

  @ApiPropertyOptional({
    default: false,
    example: false,
    description:
      'Bypasses duplicate attribute checks if identical size/thread/material fasteners exist.',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allowDuplicate?: boolean = false;
}
