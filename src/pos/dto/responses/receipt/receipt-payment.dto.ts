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
    description: 'Reference ID (populated for GCASH)',
  })
  reference_number?: string;
}
