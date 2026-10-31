import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitOfMeasure } from 'src/generated/prisma/client';

export class DeliveryItemResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 101 })
  productId!: number;

  @ApiPropertyOptional({ example: 'Hex Bolt M8-1.25 x 30mm' })
  productName?: string;

  @ApiPropertyOptional({ example: 'BLT-M8-30-SS' })
  productSku?: string;

  @ApiProperty({
    example: 2.0,
    description: 'Physical quantity received in received_uom',
  })
  received_quantity!: number;

  @ApiProperty({
    enum: UnitOfMeasure,
    example: UnitOfMeasure.SACK,
    description: 'Packaging unit of measure received during delivery',
  })
  received_uom!: UnitOfMeasure;

  @ApiProperty({
    example: 1000.0,
    description: 'Multiplier used to convert received_uom to base_uom',
  })
  uom_conversion_factor!: number;

  @ApiProperty({
    example: 2000.0,
    description:
      'Actual physical base units added to inventory (received_quantity * uom_conversion_factor)',
  })
  actual_base_quantity!: number;

  static fromEntity(entity: any): DeliveryItemResponseDto {
    return {
      id: entity.id,
      productId: entity.productId,
      productName: entity.product?.name,
      productSku: entity.product?.sku ?? undefined,
      received_quantity: Number(entity.received_quantity),
      received_uom: entity.received_uom ?? UnitOfMeasure.PCS,
      uom_conversion_factor: Number(entity.uom_conversion_factor ?? 1.0),
      actual_base_quantity: Number(entity.actual_base_quantity),
    };
  }
}

export class DeliveryResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 12 })
  poId!: number;

  @ApiProperty({ example: '2026-10-10T09:15:00.000Z' })
  delivery_date!: Date;

  @ApiProperty({ example: 3 })
  staffId!: number;

  @ApiPropertyOptional({ example: 'John Doe' })
  staffName?: string;

  @ApiProperty({ type: [DeliveryItemResponseDto] })
  deliveryItems!: DeliveryItemResponseDto[];

  static fromEntity(entity: any): DeliveryResponseDto {
    return {
      id: entity.id,
      poId: entity.poId,
      delivery_date: entity.delivery_date,
      staffId: entity.staffId,
      staffName: entity.staff
        ? `${entity.staff.first_name} ${entity.staff.last_name}`
        : undefined,
      deliveryItems: Array.isArray(entity.deliveryItems)
        ? entity.deliveryItems.map(DeliveryItemResponseDto.fromEntity)
        : [],
    };
  }
}
