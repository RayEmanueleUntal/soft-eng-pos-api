import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { PaymentMethod } from 'src/generated/prisma/client';

export enum SettlementPaymentMethod {
  CASH = 'CASH',
  GCASH = 'GCASH',
}

export class CreateCustomerPaymentDto {
  @ApiProperty({
    description:
      'Amount paid towards credit settlement (must be greater than zero)',
    example: 1500.5,
    type: Number,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Payment amount must be greater than zero' })
  @IsNotEmpty()
  amount_paid!: number;

  @ApiProperty({
    description: 'Payment method used for account collection',
    enum: SettlementPaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  payment_method!: PaymentMethod;

  @ApiPropertyOptional({
    description:
      'Reference number for check, GCash, or bank deposit (if applicable)',
    example: 'GCASH-REF-998124',
  })
  @IsOptional()
  @IsString()
  reference_number?: string;

  @ApiPropertyOptional({
    description: 'Optional notes regarding the settlement payment',
    example: 'Partial payment for June invoice',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
