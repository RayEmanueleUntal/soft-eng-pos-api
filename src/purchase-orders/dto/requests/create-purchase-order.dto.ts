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
import { CreatePOItemDto } from './create-po-item.dto';

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
