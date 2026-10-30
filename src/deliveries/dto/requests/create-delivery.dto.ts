import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UnitOfMeasure } from 'src/generated/prisma/client';

export class CreateDeliveryItemDto {
  @ApiProperty({ description: 'Product ID being received', example: 101 })
  @IsInt()
  @IsPositive()
  productId!: number;

  @ApiProperty({
    description: 'Physically received quantity in received_uom',
    example: 50.0,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001, { message: 'received_quantity must be greater than 0' })
  received_quantity!: number;

  @ApiPropertyOptional({
    enum: UnitOfMeasure,
    description:
      'Packaging unit of measure received during delivery. Defaults to POItem ordered_uom if omitted.',
    example: UnitOfMeasure.PCS,
  })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  received_uom?: UnitOfMeasure;

  @ApiPropertyOptional({
    description:
      'Multiplier converting received_uom to base_uom. Defaults to POItem uom_conversion_factor if omitted.',
    example: 1.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001, { message: 'uom_conversion_factor must be greater than 0' })
  uom_conversion_factor?: number;

  @ApiPropertyOptional({
    description:
      'Explicit physical base quantity count override (e.g., actual counted items in a sack/box). If omitted, calculated as received_quantity * uom_conversion_factor.',
    example: 50.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001, { message: 'actual_base_quantity must be greater than 0' })
  actual_base_quantity?: number;
}

export class CreateDeliveryDto {
  @ApiProperty({
    description: 'ID of the Purchase Order being fulfilled',
    example: 12,
  })
  @IsInt()
  @IsPositive()
  poId!: number;

  @ApiProperty({
    type: [CreateDeliveryItemDto],
    description: 'Items and quantities verified during physical unpacking',
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Delivery must contain at least one item.' })
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryItemDto)
  items!: CreateDeliveryItemDto[];
}
