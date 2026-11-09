import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

export class FastMovingItemDto {
  @ApiProperty({ description: 'Product ID', example: 101 })
  productId!: number;

  @ApiPropertyOptional({ description: 'Product SKU', example: 'BLT-M8-30-SS' })
  sku!: string | null;

  @ApiProperty({
    description: 'Product name',
    example: 'Hex Bolt M8-1.25 x 30mm',
  })
  name!: string;

  @ApiProperty({ description: 'Category name', example: 'Bolts' })
  category_name!: string;

  @ApiProperty({
    description: 'Base unit of measure',
    enum: UnitOfMeasure,
    example: 'PCS',
  })
  base_uom!: UnitOfMeasure;

  @ApiProperty({
    description: 'Current available physical stock',
    example: 450.0,
  })
  current_quantity!: number;

  @ApiProperty({
    description: 'Total base units sold within date range',
    example: 1250.0,
  })
  total_base_quantity_sold!: number;

  @ApiProperty({
    description: 'Total gross revenue generated',
    example: 18750.0,
  })
  total_revenue!: number;

  @ApiProperty({ description: 'Total gross profit generated', example: 6250.0 })
  total_gross_profit!: number;

  @ApiProperty({
    description: 'Number of completed transactions involving this item',
    example: 42,
  })
  transaction_count!: number;
}

export class SlowMovingItemDto {
  @ApiProperty({ description: 'Product ID', example: 204 })
  productId!: number;

  @ApiPropertyOptional({ description: 'Product SKU', example: 'NUT-M12-ZNC' })
  sku!: string | null;

  @ApiProperty({
    description: 'Product name',
    example: 'Hex Nut M12 Zinc Plated',
  })
  name!: string;

  @ApiProperty({ description: 'Category name', example: 'Nuts' })
  category_name!: string;

  @ApiProperty({
    description: 'Storage bin location string',
    example: 'Aisle 3, Shelf B',
  })
  bin_location!: string;

  @ApiProperty({
    description: 'Base unit of measure',
    enum: UnitOfMeasure,
    example: 'PCS',
  })
  base_uom!: UnitOfMeasure;

  @ApiProperty({
    description: 'Unsold physical inventory sitting in stock',
    example: 850.0,
  })
  current_quantity!: number;

  @ApiProperty({
    description: 'Purchasing cost price per base unit',
    example: 12.5,
  })
  cost_price!: number;

  @ApiProperty({
    description:
      'Total capital tied up in stagnant stock (current_quantity * cost_price)',
    example: 10625.0,
  })
  tied_up_capital!: number;

  @ApiProperty({
    description: 'Total base quantity sold during aging period',
    example: 0.0,
  })
  sales_in_aging_period!: number;

  @ApiPropertyOptional({
    description: 'Date of last recorded completed sale or outbound movement',
    example: '2025-11-10T08:00:00.000Z',
  })
  last_sale_date!: Date | null;

  @ApiProperty({
    description: 'Calculated number of consecutive days without sales',
    example: 120,
  })
  days_without_sales!: number;
}

export class InventoryVelocityResponseDto {
  @ApiProperty({
    type: [FastMovingItemDto],
    description: 'Top-performing / fast-moving products ranked by sales',
  })
  fast_moving_items!: FastMovingItemDto[];

  @ApiProperty({
    type: [SlowMovingItemDto],
    description: 'Underperforming / dead stock products with tied up capital',
  })
  slow_moving_items!: SlowMovingItemDto[];
}
