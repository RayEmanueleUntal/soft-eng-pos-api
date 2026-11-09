import { ApiProperty } from '@nestjs/swagger';

export class MetricValueDto {
  @ApiProperty({
    description: 'Absolute monetary amount in local currency',
    example: 154500.5,
  })
  amount!: number;

  @ApiProperty({
    description: 'Percentage margin relative to total revenue',
    example: 35.5,
  })
  margin_percentage!: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({
    description:
      'Total Sales Revenue (Sum of grand_total for COMPLETED transactions)',
    example: 250000.0,
  })
  total_sales_revenue!: number;

  @ApiProperty({
    description: 'Total Cost of Goods Sold snapshot at moment of sale',
    example: 162500.0,
  })
  total_cogs!: number;

  @ApiProperty({
    description: 'Gross Profit and Gross Margin Percentage (Revenue - COGS)',
  })
  gross_profit!: MetricValueDto;

  @ApiProperty({
    description: 'Total General Operating Expenses (Sum of Expense records)',
    example: 32000.0,
  })
  total_opex!: number;

  @ApiProperty({
    description: 'Net Profit and Net Margin Percentage (Gross Profit - OpEx)',
  })
  net_profit!: MetricValueDto;

  @ApiProperty({
    description:
      'Total Active Accounts Receivable (Current outstanding debt owed by wholesale customers)',
    example: 45800.0,
  })
  total_active_receivables!: number;

  static fromMetrics(data: {
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    grossMarginPercentage: number;
    totalOpEx: number;
    netProfit: number;
    netMarginPercentage: number;
    totalActiveReceivables: number;
  }): DashboardSummaryResponseDto {
    return {
      total_sales_revenue: Number(data.totalRevenue.toFixed(2)),
      total_cogs: Number(data.totalCogs.toFixed(2)),
      gross_profit: {
        amount: Number(data.grossProfit.toFixed(2)),
        margin_percentage: Number(data.grossMarginPercentage.toFixed(2)),
      },
      total_opex: Number(data.totalOpEx.toFixed(2)),
      net_profit: {
        amount: Number(data.netProfit.toFixed(2)),
        margin_percentage: Number(data.netMarginPercentage.toFixed(2)),
      },
      total_active_receivables: Number(data.totalActiveReceivables.toFixed(2)),
    };
  }
}
