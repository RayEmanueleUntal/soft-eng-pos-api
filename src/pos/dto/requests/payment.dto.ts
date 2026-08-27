import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from 'src/generated/prisma/enums';
import {
  CashDetailsDto,
  CreditDetailsDto,
  GCashDetailsDto,
} from './payment-details.dto';

export class PaymentDto {
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  payment_method!: PaymentMethod;

  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  amount_paid!: number;

  @IsOptional()
  @ValidateNested()
  @Type((opts) => {
    const method = opts?.object?.payment_method;
    switch (method) {
      case PaymentMethod.CASH:
        return CashDetailsDto;
      case PaymentMethod.GCASH:
        return GCashDetailsDto;
      case PaymentMethod.CREDIT:
        return CreditDetailsDto;
      default:
        return Object;
    }
  })
  details?: CashDetailsDto | GCashDetailsDto | CreditDetailsDto;
}
