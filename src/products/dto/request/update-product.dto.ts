import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 'BLT-M8-30-SS',
    description:
      'Updated SKU or barcode. If explicitly set to empty string or null, an auto-generated SKU will be built based on attributes.',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    example: 'Hex Bolt M8-1.25 x 30mm (Grade 316)',
    description: 'Updated descriptive product name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Updated parent Category ID',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({
    example: 'M8 x 30mm',
    description: 'Updated fastener dimensions',
  })
  @IsOptional()
  @IsString()
  size_dimensions?: string;

  @ApiPropertyOptional({
    example: 'M8x1.25',
    description: 'Updated thread specification',
  })
  @IsOptional()
  @IsString()
  thread_type?: string;

  @ApiPropertyOptional({
    example: 'Stainless 316',
    description: 'Updated material composition grade',
  })
  @IsOptional()
  @IsString()
  material_grade?: string;

  @ApiPropertyOptional({
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    example: UnitOfMeasure.PCS,
    description:
      'Base inventory unit. Changing this requires confirmUomChange=true and triggers needsRecount=true.',
  })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  base_uom?: UnitOfMeasure;

  @ApiPropertyOptional({
    example: 25.0,
    description: 'Adjust reorder point threshold',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorder_point_ROP?: number;

  @ApiPropertyOptional({
    enum: UnitOfMeasure,
    enumName: 'UnitOfMeasure',
    example: UnitOfMeasure.PCS,
    description: 'Pricing unit specification',
  })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  pricing_uom?: UnitOfMeasure;

  @ApiPropertyOptional({
    example: 1.0,
    description:
      'Quantity multiplier for pricing_uom (e.g., 100 for per hundred)',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  pricing_unit_qty?: number;

  @ApiPropertyOptional({
    example: 14.0,
    description: 'Acquisition cost per pricing unit',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cost_price?: number;

  @ApiPropertyOptional({
    example: 28.0,
    description:
      'Standard retail selling price per pricing unit (VAT-inclusive)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  retail_price?: number;

  @ApiPropertyOptional({
    example: 22.0,
    description: 'Wholesale selling price per pricing unit',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  wholesale_price?: number;

  @ApiPropertyOptional({
    example: 5,
    description:
      'Updated physical BinLocation ID. Pass null to unassign location.',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  binId?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Manually flag or clear stock count reconciliation flag',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  needsRecount?: boolean;

  @ApiPropertyOptional({
    default: false,
    example: false,
    description:
      'Bypasses duplicate attribute checks if another fastener shares identical specs.',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allowDuplicate?: boolean = false;

  @ApiPropertyOptional({
    default: false,
    example: false,
    description:
      'Safety confirmation flag required when changing base_uom on existing products.',
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  confirmUomChange?: boolean = false;
}
