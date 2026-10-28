import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { UnitOfMeasure } from 'src/generated/prisma/client';

export class CreateProductUomDto {
  @ApiProperty({
    enum: UnitOfMeasure,
    description: 'Alternate Unit of Measure (e.g., BOX, SACK, GROSS)',
    example: UnitOfMeasure.BOX,
  })
  @IsEnum(UnitOfMeasure)
  uom!: UnitOfMeasure;

  @ApiProperty({
    description:
      'Conversion factor to Base UoM. How many (Approximate) Base UoM units are in 1 of this UoM? (e.g., 1 Box = 100 PCS -> factor: 100)',
    example: 100.0,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  conversion_factor!: number;

  @ApiPropertyOptional({
    description:
      'Purchasing cost price override for this package size. If omitted, falls back to base cost * conversion_factor.',
    example: 450.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost_price?: number;

  @ApiPropertyOptional({
    description:
      'Retail selling price override for this package size. If omitted, falls back to base retail * conversion_factor.',
    example: 600.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  retail_price?: number;

  @ApiPropertyOptional({
    description:
      'Wholesale selling price override for this package size. If omitted, falls back to base wholesale * conversion_factor.',
    example: 550.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  wholesale_price?: number;

  @ApiPropertyOptional({
    description:
      'Flag indicating whether this UoM is the default choice on Purchase Orders.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default_purchase?: boolean;

  @ApiPropertyOptional({
    description:
      'Flag indicating whether this UoM is the default choice at POS checkout.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default_sales?: boolean;
}
