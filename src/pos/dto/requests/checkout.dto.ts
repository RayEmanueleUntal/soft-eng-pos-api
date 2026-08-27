import { Type, Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  ArrayMinSize,
  IsOptional,
  IsPositive,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { TransactionType } from 'src/generated/prisma/enums';
import { ItemDto } from './item.dto';
import { PaymentDto } from './payment.dto';

export class CheckoutDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  customerId?: number;

  @IsOptional()
  @IsEnum(() => TransactionType)
  transaction_type?: TransactionType = TransactionType.RETAIL;

  @IsArray()
  @ArrayMinSize(1, { message: 'Checkout must contain at least one item.' })
  @ArrayUnique((item: ItemDto) => item.productId, {
    message: 'Each item ID in the array must be unique.',
  })
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items!: ItemDto[];

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one payment method is required.' })
  @ArrayUnique((payment: PaymentDto) => payment.payment_method, {
    message: 'Each payment method should only appear once.',
  })
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments!: PaymentDto[];

  @IsOptional()
  @IsBoolean()
  override?: boolean = false;
}
