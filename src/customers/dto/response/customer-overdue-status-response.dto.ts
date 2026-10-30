import { ApiProperty } from '@nestjs/swagger';

export class CustomerOverdueStatusResponseDto {
  @ApiProperty({ example: 42 })
  customerId!: number;

  @ApiProperty({ example: true })
  hasOverdue!: boolean;

  @ApiProperty({
    example: 2,
    description: 'Number of open overdue invoices/payments',
  })
  overdueCount!: number;

  @ApiProperty({
    example: 3500.0,
    description: 'Total monetary value past due',
  })
  totalOverdueAmount!: number;
}
