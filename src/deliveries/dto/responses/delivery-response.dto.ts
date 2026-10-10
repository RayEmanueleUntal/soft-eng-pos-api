import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryItemResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 101 })
  productId!: number;

  @ApiPropertyOptional({ example: 'Hex Bolt M8-1.25 x 30mm' })
  productName?: string;

  @ApiPropertyOptional({ example: 'BLT-M8-30-SS' })
  productSku?: string;

  @ApiProperty({ example: 50.0 })
  received_quantity!: number;

  static fromEntity(entity: any): DeliveryItemResponseDto {
    return {
      id: entity.id,
      productId: entity.productId,
      productName: entity.product?.name,
      productSku: entity.product?.sku ?? undefined,
      received_quantity: Number(entity.received_quantity),
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
