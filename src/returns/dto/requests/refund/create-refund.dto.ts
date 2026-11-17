import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

import { ItemCondition, UnitOfMeasure } from 'src/generated/prisma/enums';

export { ItemCondition };

export class RefundItemDto {
  @ApiProperty({ example: 5, description: 'Product ID being returned' })
  @IsInt()
  @IsNotEmpty()
  productId!: number;

  @ApiProperty({
    example: 2,
    description: 'Quantity returned in the specified unit_of_measure',
  })
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty({
    enum: UnitOfMeasure,
    required: false,
    description:
      'UOM of the returned quantity (must match either purchased UOM or product base_uom; defaults to product base_uom)',
  })
  @IsEnum(UnitOfMeasure)
  @IsOptional()
  unit_of_measure?: UnitOfMeasure;

  @ApiProperty({
    enum: ItemCondition,
    description: 'Condition of the returned item',
  })
  @IsEnum(ItemCondition)
  condition!: ItemCondition;

  @ApiProperty({
    example: 'Stripped threads',
    description: 'Reason for return',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class CreateRefundDto {
  @ApiProperty({ example: 101, description: 'Original Transaction ID' })
  @IsInt()
  @IsNotEmpty()
  transactionId!: number;

  @ApiProperty({
    type: [RefundItemDto],
    description: 'List of products being returned from this transaction',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items!: RefundItemDto[];
}
