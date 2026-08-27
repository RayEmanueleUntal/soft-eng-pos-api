import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from 'src/generated/prisma/enums';

export class ReceiptItemDto {
  @ApiProperty({
    example: 'San Miguel Beer 330ml Can',
    description: 'Product name',
  })
  product_name!: string;

  @ApiProperty({ example: 6, description: 'Quantity sold' })
  quantity!: number;

  @ApiProperty({
    example: 65.0,
    description: 'Base price applied per unit before line discount',
  })
  applied_price!: number;

  @ApiProperty({
    example: 390.0,
    description: 'Gross item subtotal (quantity * applied_price)',
  })
  subtotal!: number;

  @ApiProperty({ example: 360.0, description: 'Net item total after discount' })
  discounted_price!: number;

  @ApiProperty({ example: 360.0, description: 'Final net line price paid' })
  net_price!: number;

  @ApiProperty({ enum: TransactionType, example: TransactionType.RETAIL })
  type!: TransactionType;
}
