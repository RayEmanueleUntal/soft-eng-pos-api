import { ApiProperty } from '@nestjs/swagger';
import { ProductItemResponseDto } from './product-item-response.dto';
import { PaginationMetaDto } from './pagination-meta.dto';
import {
  BinLocation,
  Category,
  Product,
  ProductUom,
} from 'src/generated/prisma/client';

type ProductWithRelations = Product & {
  category?: Category | null;
  bin_location?: BinLocation | null;
  uoms?: ProductUom[];
};

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: [ProductItemResponseDto] })
  data!: ProductItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;

  static fromEntities(
    products: ProductWithRelations[],
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
