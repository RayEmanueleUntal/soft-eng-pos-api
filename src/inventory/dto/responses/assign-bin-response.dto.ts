import { ApiProperty } from '@nestjs/swagger';
import { Product, BinLocation } from 'src/generated/prisma/client';

type ProductWithBin = Product & {
  bin_location: BinLocation | null;
};

export class AssignBinResponseDto {
  @ApiProperty({ example: 42, description: 'Product ID' })
  productId!: number;

  @ApiProperty({ example: 'BLT-M8-30-SS', nullable: true })
  sku!: string | null;

  @ApiProperty({ example: 'Hex Bolt M8-1.25 x 30mm' })
  name!: string;

  @ApiProperty({ example: 12, nullable: true, description: 'Assigned Bin ID' })
  binId!: number | null;

  @ApiProperty({
    example: 'Aisle 3',
    nullable: true,
    description: 'Bin Aisle Number',
  })
  binAisleNumber!: string | null;

  @ApiProperty({
    example: 'Shelf B - Bin 12',
    nullable: true,
    description: 'Bin Shelf Location',
  })
  binShelfLocation!: string | null;

  @ApiProperty({ example: '2026-08-25T20:30:00.000Z' })
  updatedAt!: Date;

  /**
   * Static Factory Method to transform the updated Prisma Product record
   */
  static fromEntity(product: ProductWithBin): AssignBinResponseDto {
    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      binId: product.binId,
      binAisleNumber: product.bin_location?.aisle_number ?? null,
      binShelfLocation: product.bin_location?.shelf_location ?? null,
      updatedAt: product.updatedAt,
    };
  }
}
