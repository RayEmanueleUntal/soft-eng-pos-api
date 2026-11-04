import { ApiProperty } from '@nestjs/swagger';
import { POStatus } from 'src/generated/prisma/enums';
import { POItemResponseDto } from './po-item-response.dto';

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
