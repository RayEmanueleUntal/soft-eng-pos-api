import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StockMovement,
  MovementType,
  UnitOfMeasure,
  Product,
  StaffUser,
} from 'src/generated/prisma/client';

export class StaffSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiProperty({ example: 'John' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;
}

export class ProductSummaryDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiPropertyOptional({ example: 'BLT-M8-30-SS' })
  sku?: string;

  @ApiProperty({ example: 'Hex Bolt M8-1.25 x 30mm' })
  name!: string;

  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.PCS })
  baseUom!: UnitOfMeasure;
}

// Type representing a StockMovement entity with optional relation includes
type StockMovementWithRelations = StockMovement & {
  product?: Product;
  staff?: StaffUser;
  approvedBy?: StaffUser | null;
};

export class StockMovementResponseDto {
  @ApiProperty({ example: 501, description: 'Unique StockMovement ID' })
  id!: number;

  @ApiProperty({ example: 42, description: 'Target Product ID' })
  productId!: number;

  @ApiProperty({ example: '2026-08-25T20:00:00.000Z' })
  date!: Date;

  @ApiProperty({ enum: MovementType, example: MovementType.ADJUSTMENT })
  type!: MovementType;

  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.PCS })
  current_uom!: UnitOfMeasure;

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

  @ApiPropertyOptional({ type: () => ProductSummaryDto })
  product?: ProductSummaryDto;

  @ApiPropertyOptional({ type: () => StaffSummaryDto })
  staff?: StaffSummaryDto;

  @ApiPropertyOptional({ type: () => StaffSummaryDto, nullable: true })
  approvedBy?: StaffSummaryDto | null;

  /**
   * Static mapper to convert Prisma StockMovement entity (with Decimals and optional relations)
   * into standard response DTO (with native JS numbers).
   */
  static fromEntity(
    movement: StockMovementWithRelations,
  ): StockMovementResponseDto {
    return {
      id: movement.id,
      productId: movement.productId,
      date: movement.date,
      type: movement.type,
      current_uom: movement.current_uom,
      quantity_changed: movement.quantity_changed.toNumber(),
      previous_quantity: movement.previous_quantity.toNumber(),
      new_quantity: movement.new_quantity.toNumber(),
      isOverride: movement.isOverride,
      reason: movement.reason,
      staffId: movement.staffId,
      approvedById: movement.approvedById,
      ...(movement.product && {
        product: {
          id: movement.product.id,
          sku: movement.product.sku ?? undefined,
          name: movement.product.name,
          baseUom: movement.product.base_uom,
        },
      }),
      ...(movement.staff && {
        staff: {
          id: movement.staff.id,
          username: movement.staff.username,
          firstName: movement.staff.first_name,
          lastName: movement.staff.last_name,
        },
      }),
      ...(movement.approvedBy && {
        approvedBy: {
          id: movement.approvedBy.id,
          username: movement.approvedBy.username,
          firstName: movement.approvedBy.first_name,
          lastName: movement.approvedBy.last_name,
        },
      }),
    };
  }
}
