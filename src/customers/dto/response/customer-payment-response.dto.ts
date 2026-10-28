import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from 'src/generated/prisma/enums';
import { CustomerPayment } from 'src/generated/prisma/client';

export class CustomerPaymentResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 42 })
  wholesaleCustId!: number;

  @ApiProperty({ example: 7 })
  staffId!: number;

  @ApiProperty({ example: 1500.5 })
  amount_paid!: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  payment_method!: PaymentMethod;

  @ApiPropertyOptional({ example: 'GCASH-REF-998124' })
  reference_number?: string;

  @ApiProperty({ example: '2026-10-28T08:00:00.000Z' })
  payment_date!: Date;

  @ApiPropertyOptional({ example: 'Partial payment for June invoice' })
  notes?: string;

  @ApiProperty({
    example: 5000.0,
    description: 'Outstanding balance prior to payment',
  })
  previous_balance!: number;

  @ApiProperty({
    example: 3499.5,
    description: 'Outstanding balance following payment',
  })
  new_balance!: number;

  static fromEntity(entity: CustomerPayment): CustomerPaymentResponseDto {
    return {
      id: entity.id,
      wholesaleCustId: entity.wholesaleCustId,
      staffId: entity.staffId,
      amount_paid: Number(entity.amount_paid),
      payment_method: entity.payment_method,
      reference_number: entity.reference_number ?? undefined,
      payment_date: entity.payment_date,
      notes: entity.notes ?? undefined,
      previous_balance: Number(entity.previous_balance),
      new_balance: Number(entity.new_balance),
    };
  }
}
