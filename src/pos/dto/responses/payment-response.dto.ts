import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from 'src/generated/prisma/enums';

export class PaymentResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  payment_method!: PaymentMethod;

  @ApiProperty({ example: 500.0 })
  amount_paid!: number;

  @ApiPropertyOptional({
    example: { cash_tendered: 500.0, change_given: 50.0 },
  })
  details?: Record<string, any>;
}
