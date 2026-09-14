import { ApiProperty } from '@nestjs/swagger';

export class ReceiptReturnDto {
  @ApiProperty({ example: 1, description: 'Return record ID' })
  id!: number;

  @ApiProperty({ example: 12, description: 'Returned Product ID' })
  productId!: number;

  @ApiProperty({
    example: 'Hex Bolt M8-1.25 x 30mm',
    description: 'Name of returned product item',
  })
  product_name!: string;

  @ApiProperty({ example: 2.0, description: 'Quantity returned' })
  quantity!: number;

  @ApiProperty({ example: '2026-09-02T14:15:00.000Z' })
  date!: Date;

  @ApiProperty({
    example: 'Damaged threads upon opening box',
    description: 'Reason provided for return item',
  })
  defect_reason!: string;

  @ApiProperty({
    example: 120.0,
    description: 'Total amount refunded to customer for this line',
  })
  refund_amount!: number;

  @ApiProperty({
    example: 'Juan Dela Cruz',
    description: 'Staff member who approved/processed the return',
  })
  processed_by_staff!: string;
}
