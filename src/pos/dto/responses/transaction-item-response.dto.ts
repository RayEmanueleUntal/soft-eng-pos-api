import { ApiProperty } from '@nestjs/swagger';
import { TransactionItem } from 'src/generated/prisma/client';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

export class TransactionItemResponseDto {
  @ApiProperty({
    example: 12,
    description: 'Unique primary key ID of transaction item',
  })
  id!: number;

  @ApiProperty({
    example: 42,
    description: 'Unique primary key ID of the product',
  })
  productId!: number;

  @ApiProperty({
    example: UnitOfMeasure.PCS,
    description: 'Unit of measure of the product',
  })
  unit_of_measure!: UnitOfMeasure;

  @ApiProperty({
    example: 100.0,
    description: 'Unit price of the product',
  })
  unit_price!: number;

  @ApiProperty({
    example: 45,
    description: 'Quantity of items sold',
  })
  quantity_sold!: number;

  @ApiProperty({
    example: 4500.0,
    description: 'Subtotal of transaction item',
  })
  subtotal!: number;

  @ApiProperty({
    example: 100.0,
    description: 'Discount applied for the entire transaction item',
  })
  discount!: number;

  static fromEntity(
    transactionItem: TransactionItem,
  ): TransactionItemResponseDto {
    return {
      ...transactionItem,
      unit_price: transactionItem.unit_price.toNumber(),
      quantity_sold: transactionItem.quantity_sold.toNumber(),
      subtotal: transactionItem.subtotal.toNumber(),
      discount: transactionItem.discount.toNumber(),
    };
  }
}
