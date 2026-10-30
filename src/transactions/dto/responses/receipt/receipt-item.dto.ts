import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType, UnitOfMeasure } from 'src/generated/prisma/enums';
import { Prisma } from 'src/generated/prisma/client';

export class ReceiptItemDto {
  @ApiProperty({ description: 'ID of the purchased product', example: 101 })
  productId!: number;

  @ApiProperty({
    description: 'Name of the product at time of transaction',
    example: 'Hex Bolt M8-1.25 x 30mm',
  })
  product_name!: string;

  @ApiProperty({
    description: 'Quantity sold in the selected unit of measure',
    example: 2.0,
  })
  quantity!: number;

  @ApiProperty({
    description: 'Selling unit of measure used during transaction',
    enum: UnitOfMeasure,
    example: UnitOfMeasure.BOX,
  })
  pricing_uom!: UnitOfMeasure;

  @ApiProperty({
    description: 'Unit conversion multiplier relative to base unit',
    example: 100.0,
  })
  uom_conversion_factor!: number;

  @ApiProperty({
    description: 'Calculated canonical base quantity deducted from inventory',
    example: 200.0,
  })
  base_quantity_deducted!: number;

  @ApiProperty({
    description: 'Unit price per selected unit of measure at sale',
    example: 150.0,
  })
  applied_price!: number;

  @ApiProperty({
    description: 'Line item discount applied',
    example: 10.0,
  })
  discounted_price!: number;

  @ApiProperty({
    description: 'Calculated subtotal for line item',
    example: 290.0,
  })
  subtotal!: number;

  @ApiPropertyOptional({
    description: 'Quantity returned previously for this line item',
    example: 0,
  })
  already_returned_qty?: number;

  static fromEntity(
    item: {
      productId: number;
      product?: { name: string };
      quantity_sold: Prisma.Decimal | number;
      unit_of_measure: UnitOfMeasure;
      uom_conversion_factor: Prisma.Decimal | number;
      base_quantity_deducted: Prisma.Decimal | number;
      unit_price: Prisma.Decimal | number;
      discount: Prisma.Decimal | number;
      subtotal: Prisma.Decimal | number;
    },
    alreadyReturnedQty = 0,
  ): ReceiptItemDto {
    const dto = new ReceiptItemDto();
    dto.productId = item.productId;
    dto.product_name = item.product?.name ?? 'Unknown Product';
    dto.quantity = Number(item.quantity_sold);
    dto.pricing_uom = item.unit_of_measure;
    dto.uom_conversion_factor = Number(item.uom_conversion_factor);
    dto.base_quantity_deducted = Number(item.base_quantity_deducted);
    dto.applied_price = Number(item.unit_price);
    dto.discounted_price = Number(item.discount);
    dto.subtotal = Number(item.subtotal);
    dto.already_returned_qty = alreadyReturnedQty;
    return dto;
  }
}
