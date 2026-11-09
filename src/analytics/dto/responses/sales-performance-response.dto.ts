import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from 'src/generated/prisma/enums';

export class SalesTrendDataPointDto {
  @ApiProperty({
    description: 'Date or period label (e.g., 2026-03-31, 2026-W13, 2026-03)',
    example: '2026-03-31',
  })
  date_label!: string;

  @ApiProperty({
    description: 'Total sales revenue for the period',
    example: 12500.0,
  })
  revenue!: number;

  @ApiProperty({
    description: 'Total Net Profit for the period (Revenue - COGS - OpEx)',
    example: 4200.5,
  })
  net_profit!: number;
}

export class PaymentMethodBreakdownDto {
  @ApiProperty({
    description: 'Payment method name or UNCATEGORIZED fallback',
    example: 'CASH',
  })
  payment_method!: string;

  @ApiProperty({
    description: 'Total revenue collected via this payment method',
    example: 45000.0,
  })
  total_amount!: number;

  @ApiProperty({
    description: 'Percentage share of total payments',
    example: 60.0,
  })
  percentage_share!: number;
}

export class SummaryLedgerDto {
  @ApiProperty({
    description: 'Total sales revenue snapshot',
    example: 75000.0,
  })
  total_revenue!: number;

  @ApiProperty({
    description: 'Total line-item and transaction discounts applied',
    example: 1200.0,
  })
  total_discounts!: number;

  @ApiProperty({
    description: 'Total Cost of Goods Sold (COGS)',
    example: 48000.0,
  })
  total_cogs!: number;

  @ApiProperty({
    description: 'Gross profit amount (Revenue - COGS)',
    example: 27000.0,
  })
  gross_profit!: number;

  @ApiProperty({ description: 'Gross profit margin percentage', example: 36.0 })
  gross_profit_margin_percentage!: number;
}

export class SalesPerformanceResponseDto {
  @ApiProperty({
    type: [SalesTrendDataPointDto],
    description: 'Sales and Net Profit trend data over time',
  })
  trend!: SalesTrendDataPointDto[];

  @ApiProperty({
    type: [PaymentMethodBreakdownDto],
    description: 'Revenue breakdown by payment method',
  })
  payment_breakdown!: PaymentMethodBreakdownDto[];

  @ApiProperty({
    type: SummaryLedgerDto,
    description: 'Summary ledger metrics',
  })
  summary_ledger!: SummaryLedgerDto;
}
