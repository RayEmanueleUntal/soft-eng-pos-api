import { ApiProperty } from '@nestjs/swagger';
import { InventoryItemResponseDto } from './inventory-item-response.dto';
import { Product } from 'src/generated/prisma/client';

export class LowStockAlertsResponseDto {
  @ApiProperty({
    type: [InventoryItemResponseDto],
    description:
      'List of products whose stock is at or below reorder point threshold',
  })
  items!: InventoryItemResponseDto[];

  @ApiProperty({
    example: 5,
    description: 'Total count of products requiring reorder',
  })
  totalAlerts!: number;

  static fromEntities(products: Product[]): LowStockAlertsResponseDto {
    return {
      items: products.map(InventoryItemResponseDto.fromEntity),
      totalAlerts: products.length,
    };
  }
}
