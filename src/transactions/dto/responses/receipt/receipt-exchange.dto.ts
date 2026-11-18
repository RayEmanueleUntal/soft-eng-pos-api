import { ApiProperty } from '@nestjs/swagger';

export class ReceiptExchangeDto {
  @ApiProperty({ example: 1, description: 'Exchange record ID' })
  id!: number;

  @ApiProperty({ example: 15, description: 'Exchanged Product ID' })
  productId!: number;

  @ApiProperty({
    example: 'Hex Bolt M10-1.50 x 40mm',
    description: 'Name of exchanged product item',
  })
  product_name!: string;

  @ApiProperty({
    example: 2.0,
    description: 'Quantity exchanged (in Base UOM)',
  })
  quantity!: number;

  @ApiProperty({ example: '2026-09-03T09:00:00.000Z' })
  date!: Date;

  @ApiProperty({
    example: 3,
    description: 'Staff user ID who processed the exchange',
  })
  staffId!: number;

  @ApiProperty({
    example: 'Juan Dela Cruz',
    description: 'Staff member who processed the exchange',
  })
  processed_by_staff!: string;
}
