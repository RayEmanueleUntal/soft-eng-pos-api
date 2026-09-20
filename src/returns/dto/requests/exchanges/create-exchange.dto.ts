import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { CreateRefundDto } from '../refund/create-refund.dto';

export class CreateExchangeDto extends CreateRefundDto {
  @ApiProperty({
    example: 8,
    description: 'Product ID the customer wants instead',
  })
  @IsInt()
  @IsNotEmpty()
  newProductId!: number;

  @ApiProperty({
    example: 2.5,
    description: 'Quantity of new item requested (in Base UOM)',
  })
  @IsNumber()
  @IsPositive()
  newQuantity!: number;

  @ApiProperty({
    example: true,
    description:
      'If true, admin is requesting to override stock limits if new item is out of stock',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  allowStockOverride?: boolean = false;
}
