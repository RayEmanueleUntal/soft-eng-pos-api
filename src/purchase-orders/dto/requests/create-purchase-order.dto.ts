import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePOItemDto {
  @ApiProperty({
    description: 'The unique ID of the product being ordered.',
    example: 101,
  })
  @IsInt()
  @IsPositive()
  productId!: number;

  @ApiProperty({
    description: 'Quantity of the product to order (must be greater than 0).',
    example: 50.0,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001, { message: 'requested_quantity must be greater than 0' })
  requested_quantity!: number;

  @ApiPropertyOptional({
    description:
      'Supplier quoted unit cost. If omitted, defaults to current product cost_price.',
    example: 12.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'unit_cost cannot be negative' })
  unit_cost?: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({
    description: 'The ID of the active supplier for this purchase order.',
    example: 5,
  })
  @IsInt()
  @IsPositive()
  supplierId!: number;

  @ApiProperty({
    type: [CreatePOItemDto],
    description: 'List of items and quantities included in the purchase order.',
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: 'A Purchase Order must contain at least one item.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreatePOItemDto)
  items!: CreatePOItemDto[];
}
