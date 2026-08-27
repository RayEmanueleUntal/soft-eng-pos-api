import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
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
  @ApiProperty({
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    example: PaymentMethod.CASH,
    description: 'Selected payment method channel',
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  payment_method!: PaymentMethod;

  @ApiProperty({
    example: 450.0,
    description: 'Amount collected using this specific payment method',
  })
  @IsNotEmpty()
  @IsPositive()
  @Type(() => Number)
  amount_paid!: number;

  @ApiPropertyOptional({
    description:
      'Method-specific payment metadata (Cash, GCash, or Credit details)',
    oneOf: [
      { $ref: getSchemaPath(CashDetailsDto) },
      { $ref: getSchemaPath(GCashDetailsDto) },
      { $ref: getSchemaPath(CreditDetailsDto) },
    ],
  })
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
