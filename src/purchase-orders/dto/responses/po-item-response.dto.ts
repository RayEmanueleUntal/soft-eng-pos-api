import { ApiProperty } from '@nestjs/swagger';
import { UnitOfMeasure } from 'src/generated/prisma/enums';

export class POItemResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  productId!: number;

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

  static fromEntity(entity: any): POItemResponseDto {
    return {
      id: entity.id,
      productId: entity.productId,
      requested_quantity: Number(entity.requested_quantity),
      ordered_uom: entity.ordered_uom,
      uom_conversion_factor: Number(entity.uom_conversion_factor),
      expected_base_quantity: Number(entity.expected_base_quantity),
      unit_cost: Number(entity.unit_cost),
    };
  }
}
