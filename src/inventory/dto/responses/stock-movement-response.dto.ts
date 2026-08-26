import { ApiProperty } from '@nestjs/swagger';
import { StockMovement, MovementType } from 'src/generated/prisma/client';

export class StockMovementResponseDto {
  @ApiProperty({ example: 501, description: 'Unique StockMovement ID' })
  id!: number;

  @ApiProperty({ example: 42, description: 'Target Product ID' })
  productId!: number;

  @ApiProperty({ example: '2026-08-25T20:00:00.000Z' })
  date!: Date;

  @ApiProperty({ enum: MovementType, example: MovementType.ADJUSTMENT })
  type!: MovementType;

  @ApiProperty({ example: 'pcs' })
  current_uom!: string;

  @ApiProperty({
    example: -5.0,
    description: 'Calculated quantity delta (New - Previous)',
  })
  quantity_changed!: number;

  @ApiProperty({ example: 20.0 })
  previous_quantity!: number;

  @ApiProperty({ example: 15.0 })
  new_quantity!: number;

  @ApiProperty({ example: false })
  isOverride!: boolean;

  @ApiProperty({ example: 'Damaged stock found during count' })
  reason!: string;

  @ApiProperty({
    example: 7,
    description: 'ID of staff who performed adjustment',
  })
  staffId!: number;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'ID of manager who approved override',
  })
  approvedById!: number | null;

  /**
   * Static mapper to convert Prisma StockMovement entity (with Decimals)
   * into standard response DTO (with native JS numbers).
   */
  static fromEntity(movement: StockMovement): StockMovementResponseDto {
    return {
      ...movement,
      quantity_changed: movement.quantity_changed.toNumber(),
      previous_quantity: movement.previous_quantity.toNumber(),
      new_quantity: movement.new_quantity.toNumber(),
    };
  }
}
