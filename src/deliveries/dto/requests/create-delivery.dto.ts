import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsPositive,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDeliveryItemDto {
  @ApiProperty({ description: 'Product ID being received', example: 101 })
  @IsInt()
  @IsPositive()
  productId!: number;

  @ApiProperty({
    description: 'Physically received undamaged quantity',
    example: 50.0,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001, { message: 'received_quantity must be greater than 0' })
  received_quantity!: number;
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
