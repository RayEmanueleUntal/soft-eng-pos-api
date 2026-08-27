import { ApiProperty } from '@nestjs/swagger';
import { ProductItemResponseDto } from './product-item-response.dto';
import { PaginationMetaDto } from './pagination-meta.dto';
import { Product } from 'src/generated/prisma/client';

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: [ProductItemResponseDto] })
  data!: ProductItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;

  static fromEntities(
    products: Product[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedProductsResponseDto {
    return {
      data: products.map(ProductItemResponseDto.fromEntity),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
