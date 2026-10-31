import { ApiProperty } from '@nestjs/swagger';
import {
  Product,
  Category,
  BinLocation,
  ProductUom,
} from 'src/generated/prisma/client';
import { ProductItemResponseDto } from 'src/products/dto';

// Extended type matching product relations fetched from database
type ProductWithRelations = Product & {
  category?: Category | null;
  bin_location?: BinLocation | null;
  uoms?: ProductUom[];
};

export class LowStockAlertsResponseDto {
  @ApiProperty({
    type: [ProductItemResponseDto],
    description:
      'List of products whose stock is at or below reorder point threshold',
  })
  items!: ProductItemResponseDto[];

  @ApiProperty({
    example: 5,
    description: 'Total count of products requiring reorder',
  })
  totalAlerts!: number;

  /**
   * Static Factory Method to transform Prisma Product models into Low Stock Alert Response DTO
   */
  static fromEntities(
    products: ProductWithRelations[],
  ): LowStockAlertsResponseDto {
    return {
      items: products.map(ProductItemResponseDto.fromEntity),
      totalAlerts: products.length,
    };
  }
}
