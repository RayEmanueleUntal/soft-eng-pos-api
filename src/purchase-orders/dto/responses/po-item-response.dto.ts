import { ApiProperty } from '@nestjs/swagger';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

export class POItemResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 101 })
  productId!: number;

  @ApiProperty({ example: 'Hex Bolt M8-1.25 x 30mm' })
  productName!: string;

  @ApiProperty({ example: 'BLT-M8-30-SS', nullable: true })
  sku!: string | null;

  @ApiProperty({ example: 5.0 })
  requested_quantity!: number;

  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.BOX })
  ordered_uom!: UnitOfMeasure;

  @ApiProperty({ example: 100.0 })
  uom_conversion_factor!: number;

  @ApiProperty({ example: 500.0 })
  expected_base_quantity!: number;

  @ApiProperty({ example: 250.0 })
  unit_cost!: number;

  @ApiProperty({ example: 1250.0 })
  total_cost!: number;

  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.PCS })
  base_uom!: UnitOfMeasure;

  static fromEntity(entity: any): POItemResponseDto {
    const requestedQty = Number(entity.requested_quantity ?? 0);
    const unitCost = Number(entity.unit_cost ?? 0);
    const conversionFactor = Number(entity.uom_conversion_factor ?? 1);
    const expectedBaseQty =
      entity.expected_base_quantity !== undefined
        ? Number(entity.expected_base_quantity)
        : requestedQty * conversionFactor;

    return {
      id: entity.id,
      productId: entity.productId,
      productName: entity.product?.name ?? '',
      sku: entity.product?.sku ?? null,
      requested_quantity: requestedQty,
      ordered_uom: entity.ordered_uom ?? UnitOfMeasure.PCS,
      uom_conversion_factor: conversionFactor,
      expected_base_quantity: expectedBaseQty,
      unit_cost: unitCost,
      total_cost: Number((requestedQty * unitCost).toFixed(2)),
      base_uom: entity.product?.base_uom ?? UnitOfMeasure.PCS,
    };
  }
}
