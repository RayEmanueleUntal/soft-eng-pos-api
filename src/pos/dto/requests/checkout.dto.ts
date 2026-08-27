import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { TransactionType } from 'src/generated/prisma/enums';
import { ItemDto } from './item.dto';
import { PaymentDto } from './payment.dto';

export class CheckoutDto {
  @ApiPropertyOptional({
    example: 42,
    description:
      'ID of the registered customer. Omit for guest/walk-in transactions.',
  })
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  customerId?: number;

  @ApiPropertyOptional({
    enum: TransactionType,
    enumName: 'TransactionType',
    default: TransactionType.RETAIL,
    example: TransactionType.RETAIL,
    description: 'Classification of transaction rate type',
  })
  @IsOptional()
  @IsEnum(TransactionType)
  transaction_type?: TransactionType = TransactionType.RETAIL;

  @ApiProperty({
    type: [ItemDto],
    minItems: 1,
    description:
      'List of product items being purchased. Each product ID must be unique.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Checkout must contain at least one item.' })
  @ArrayUnique((item: ItemDto) => item.productId, {
    message: 'Each item ID in the array must be unique.',
  })
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items!: ItemDto[];

  @ApiProperty({
    type: [PaymentDto],
    minItems: 1,
    description: 'List of payment methods used to settle the checkout total.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one payment method is required.' })
  @ArrayUnique((payment: PaymentDto) => payment.payment_method, {
    message: 'Each payment method should only appear once.',
  })
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments!: PaymentDto[];

  @ApiPropertyOptional({
    default: false,
    example: false,
    description:
      'Set to true to override negative stock check errors if inventory is insufficient.',
  })
  @IsOptional()
  @IsBoolean()
  override?: boolean = false;
}
