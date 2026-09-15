import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from 'src/generated/prisma/enums';

export class ReceiptPaymentDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  payment_method!: PaymentMethod;

  @ApiProperty({
    example: 500.0,
    description: 'Amount settled with this payment method',
  })
  amount_paid!: number;

  @ApiPropertyOptional({
    example: 500.0,
    description: 'Cash tendered (only populated for CASH)',
  })
  cash_tendered?: number;

  @ApiPropertyOptional({
    example: 140.0,
    description: 'Change returned (only populated for CASH)',
  })
  change_given?: number;

  @ApiPropertyOptional({
    example: 'GC-987654321',
    description: 'Reference ID (only populated for GCASH)',
  })
  reference_number?: string;

  @ApiPropertyOptional({
    example: '09123456789',
    description: 'GCash Mobile Number (only populated for GCASH)',
  })
  gcash_mobile_number?: string;

  @ApiPropertyOptional({
    example: '2026-12-24T06:22:33.444Z',
    description: 'Due date for credit payment (only populated for CREDIT)',
  })
  due_date?: Date;

  @ApiPropertyOptional({
    example: 500.0,
    description:
      'Remaining Credit Balance after this transaction (only populated for CREDIT',
  })
  remaining_credit_balance?: number;
}
