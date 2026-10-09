import { ApiProperty } from '@nestjs/swagger';
import { POStatus, UnitOfMeasure } from 'src/generated/prisma/client';

export class POItemResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 101 })
  productId!: number;

  @ApiProperty({ example: 'Hex Bolt M8-1.25 x 30mm' })
  productName!: string;

  @ApiProperty({ example: 'BLT-M8-30-SS', nullable: true })
  sku!: string | null;

  @ApiProperty({ example: 50.0 })
  requested_quantity!: number;

  @ApiProperty({ example: 12.5 })
  unit_cost!: number;

  @ApiProperty({ example: 625.0 })
  total_cost!: number;

  @ApiProperty({ enum: UnitOfMeasure, example: 'PCS' })
  base_uom!: UnitOfMeasure;

  static fromEntity(entity: any): POItemResponseDto {
    const requestedQty = Number(entity.requested_quantity);
    const unitCost = Number(entity.unit_cost);

    return {
      id: entity.id,
      productId: entity.productId,
      productName: entity.product?.name ?? '',
      sku: entity.product?.sku ?? null,
      requested_quantity: requestedQty,
      unit_cost: unitCost,
      total_cost: Number((requestedQty * unitCost).toFixed(2)),
      base_uom: entity.product?.base_uom ?? UnitOfMeasure.PCS,
    };
  }
}

export class PurchaseOrderResponseDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 5 })
  supplierId!: number;

  @ApiProperty({ example: 'Fastener World Inc.' })
  supplierName!: string;

  @ApiProperty({ example: '2026-10-09T21:44:00.000Z' })
  order_date!: Date;

  @ApiProperty({
    enum: POStatus,
    example: POStatus.PENDING,
    description: 'Status of the Purchase Order',
  })
  po_status!: POStatus;

  @ApiProperty({ example: 2 })
  staffId!: number;

  @ApiProperty({ example: 'John Doe' })
  createdByName!: string;

  @ApiProperty({ example: 1250.0 })
  grand_total!: number;

  @ApiProperty({ type: [POItemResponseDto] })
  items!: POItemResponseDto[];

  static fromEntity(entity: any): PurchaseOrderResponseDto {
    const items = Array.isArray(entity.poItems)
      ? entity.poItems.map((item: any) => POItemResponseDto.fromEntity(item))
      : [];

    const grandTotal = items.reduce((sum, item) => sum + item.total_cost, 0);

    return {
      id: entity.id,
      supplierId: entity.supplierId,
      supplierName: entity.supplier?.name ?? '',
      order_date: entity.order_date,
      po_status: entity.po_status,
      staffId: entity.staffId,
      createdByName: entity.staff
        ? `${entity.staff.first_name} ${entity.staff.last_name}`.trim()
        : '',
      grand_total: Number(grandTotal.toFixed(2)),
      items,
    };
  }
}
