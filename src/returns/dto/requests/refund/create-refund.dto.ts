import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsEnum,
} from 'class-validator';

export enum ItemCondition {
  DEFECTIVE = 'DEFECTIVE',
  CHANGE_OF_MIND = 'CHANGE_OF_MIND',
}

export class CreateRefundDto {
  @ApiProperty({ example: 101, description: 'Original Transaction ID' })
  @IsInt()
  @IsNotEmpty()
  transactionId!: number;

  @ApiProperty({ example: 5, description: 'Product ID being returned' })
  @IsInt()
  @IsNotEmpty()
  productId!: number;

  @ApiProperty({ example: 2.5, description: 'Quantity returned (in Base UOM)' })
  @IsNumber()
  @IsPositive()
  quantity!: number;

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
