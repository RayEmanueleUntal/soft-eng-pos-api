import { ApiProperty } from '@nestjs/swagger';

export class ReceiptExchangeDto {
  @ApiProperty({ example: 1, description: 'Exchange record ID' })
  id!: number;

  @ApiProperty({ example: 15, description: 'Exchanged Product ID' })
  productId!: number;

  @ApiProperty({
    example: 'Hex Bolt M10-1.50 x 40mm',
    description: 'Name of replacement/exchanged product item',
  })
  product_name!: string;

  @ApiProperty({ example: 2.0, description: 'Quantity exchanged' })
  quantity!: number;

  @ApiProperty({ example: '2026-09-03T09:00:00.000Z' })
  date!: Date;

  @ApiProperty({
    example: 45.0,
    description:
      'Price difference charged (positive) or refunded (negative) during exchange',
  })
  price_difference!: number;

  @ApiProperty({
    example: true,
    description: 'Indicates if exchange occurred within warranty/policy limit',
  })
  is_within_7_days!: boolean;
}
