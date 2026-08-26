import { ApiProperty } from '@nestjs/swagger';
import { InventoryItemResponseDto } from './inventory-item-response.dto';
import { PaginationMetaDto } from './pagination-meta.dto';
import { Product } from 'src/generated/prisma/client';

export class PaginatedInventoryResponseDto {
  @ApiProperty({ type: [InventoryItemResponseDto] })
  data!: InventoryItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;

  static fromEntities(
    products: Product[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedInventoryResponseDto {
    return {
      data: products.map(InventoryItemResponseDto.fromEntity),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
