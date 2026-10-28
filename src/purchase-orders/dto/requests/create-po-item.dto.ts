import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

export class CreatePOItemDto {
  @ApiProperty({ description: 'Target Product ID', example: 101 })
  @IsNumber()
  productId!: number;

  @ApiProperty({
    description: 'Requested quantity in ordered UoM',
    example: 5,
  })
  @IsNumber()
  @IsPositive()
  requested_quantity!: number;

  @ApiPropertyOptional({
    enum: UnitOfMeasure,
    description:
      'Unit of measure used for ordering (defaults to product base UoM if omitted)',
    example: UnitOfMeasure.BOX,
  })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  ordered_uom?: UnitOfMeasure;

  @ApiPropertyOptional({
    description:
      'Multiplier converting 1 ordered_uom to base_uom. Defaults to ProductUom conversion factor or 1.000.',
    example: 100.0,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  uom_conversion_factor?: number;

  @ApiPropertyOptional({
    description:
      'Quoted purchase cost per ordered_uom. Defaults to product base cost or alternate UoM cost override.',
    example: 250.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_cost?: number;
}
