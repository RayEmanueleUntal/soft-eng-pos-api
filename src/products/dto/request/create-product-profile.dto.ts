import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

export class CreateProductProfileDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  categoryId!: number;

  @IsOptional()
  @IsString()
  size_dimensions?: string;

  @IsOptional()
  @IsString()
  thread_type?: string;

  @IsOptional()
  @IsString()
  material_grade?: string;

  @IsNotEmpty()
  @IsEnum(UnitOfMeasure)
  base_uom!: UnitOfMeasure;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  current_quantity?: number;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  reorder_point_ROP!: number;

  @IsNotEmpty()
  @IsEnum(UnitOfMeasure)
  pricing_uom!: UnitOfMeasure;

  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  pricing_unit_qty!: Number;

  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  cost_price!: number;

  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  retail_price!: number;

  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  wholesale_price!: number;

  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  binId!: number;
}
